# Propuesta — Bug P2002 en entregas (carrera al crear `Delivery`)

> **Estado: NO APLICADO.** Documento de revisión.
>
> Evidencia de origen: `POST` de creación de entrega que falla con
> `P2002 Unique constraint failed on the fields: (orderId)`,
> registrado en producción el 25-10 a las 00:15.
>
> Base: `waldosiclla14-bit/nutrifit-web` @ `9fd7cdd`

---

## 1. Qué pasa

Hay **dos escritores independientes** sobre la misma columna única
`deliveries.orderId`:

| # | Origen | Cómo escribe | ¿Espera? | ¿Verifica antes? |
|---|---|---|---|---|
| 1 | `orders.service.ts:528` → `autoCreateDelivery()` | `prisma.delivery.create()` directo | **No** (se lanza sin `await`, línea 477) | **No** |
| 2 | `delivery.service.ts:134` → `create()` | `prisma.delivery.create()` | Sí | Sí (`findUnique`, línea 107) |

Cuando se crea una orden METRO:

```ts
// orders.service.ts:475-480
if (deliveryType === 'METRO' && data.metroStation) {
  this.autoCreateDelivery(order, data).catch((e) =>      // ← no se espera
    this.logger.warn(`No se pudo crear entrega ...`),
  );
}
return order;   // ← la respuesta sale ANTES de que la entrega exista
```

El POS, al recibir la orden, hace su propio `POST /api/deliveries`
"justo después" (lo dice el comentario del propio servicio).

### La secuencia que rompe

```
t0   autoCreateDelivery()      → findFirst(estación)   [async, sin await]
t0   POS: POST /api/deliveries → findUnique(orderId) → null
t1   autoCreateDelivery()      → findFirst(cliente)
t1   POS                      → checks OK → create()   ✅ gana
t2   autoCreateDelivery()      → create()              ❌ P2002
```

Ambas peticiones pasan el `findUnique` **antes** de que la otra escriba.
Es un **TOCTOU** (time-of-check to time-of-use) clásico. El `findUnique`
de `DeliveryService.create()` no protege nada frente a concurrencia: solo
protege el caso secuencial.

### Por qué aparece justo en el log

El fallo de la ruta 2 (POS) **no se captura**: sube como error 500 al
vendedor. El de la ruta 1 sí se captura, pero solo deja un `logger.warn`.
Por eso el síntoma visible es "error al agendar" aunque la entrega existe.

---

## 2. Bug secundario que aparece al mirar esto

`autoCreateDelivery()` **no usa** `DeliveryService.create()`: escribe
directo con Prisma. Consecuencia: las entregas creadas por esa vía
**no pasan por**:

- `audit(delivery.id, 'CREATED', ...)` → sin rastro en `DeliveryAuditLog`
- creación de tarea en Todoist
- notificación al cliente

O sea: según quién gane la carrera, la entrega queda auditada o no.
Es un problema aparte del 500, y más silencioso.

---

## 3. Arreglo propuesto

### 3.1 Parche A — idempotencia real en `DeliveryService.create()`

`backend/src/delivery/delivery.service.ts`, alrededor de la línea 134.

```diff
     const deliveryCode = crypto.randomInt(1000, 9999).toString();

-    const delivery = await this.prisma.delivery.create({
-      data: { ... },
-      include: { station: true, order: true },
-    });
+    let delivery;
+    try {
+      delivery = await this.prisma.delivery.create({
+        data: { ... },
+        include: { station: true, order: true },
+      });
+    } catch (e: any) {
+      // Carrera con autoCreateDelivery(): el findUnique de arriba pasó, pero
+      // otra petición creó la entrega en el intertanto. Devolvemos la que ganó
+      // en vez de un 500.
+      if (e?.code === 'P2002') {
+        const concurrent = await this.prisma.delivery.findUnique({
+          where: { orderId: data.orderId },
+          include: { station: true, order: true },
+        });
+        if (concurrent) {
+          this.logger.warn(
+            `Entrega ya creada por otra peticion (orden ${data.orderId}); se reutiliza`,
+          );
+          return concurrent;
+        }
+      }
+      throw e;
+    }
```

**Efecto:** el POS deja de recibir 500 y devuelve la entrega existente.
No cambia ningún otro camino.

**Riesgo:** bajo. Solo se activa cuando Prisma lanza `P2002`, que hoy
termina en 500 de todas formas.

### 3.2 Parche B — guarda en `autoCreateDelivery()`

`backend/src/orders/orders.service.ts`, antes de la línea 528.

```diff
       const crypto = await import('crypto');
       const deliveryCode = crypto.randomInt(1000, 9999).toString();

+      const yaExiste = await this.prisma.delivery.findUnique({
+        where: { orderId: order.id },
+        select: { id: true },
+      });
+      if (yaExiste) {
+        this.logger.log(`Delivery ya existia para orden ${order.orderNumber}`);
+        return;
+      }
+
       await this.prisma.delivery.create({
```

Y en el `catch` (línea 543), distinguir la carrera de un error real:

```diff
     } catch (e: any) {
-      this.logger.error(`Error auto-creando delivery: ${e?.message}`);
+      if (e?.code === 'P2002') {
+        this.logger.log(`Delivery ya existia (carrera) para orden ${order.orderNumber}`);
+        return;
+      }
+      this.logger.error(`Error auto-creando delivery: ${e?.message}`);
     }
```

**Efecto:** el log deja de marcar como error algo que es normal. Reduce
la ventana, aunque no la elimina (el parche A es el que la cierra).

### 3.3 Lo que **no** incluye esta propuesta

**Unificar los dos caminos** para que `autoCreateDelivery()` use
`DeliveryService.create()` y así todas las entregas pasen por auditoría,
Todoist y notificación.

Es el arreglo correcto de fondo, pero requiere:

- que `OrdersModule` importe `DeliveryModule`
- verificar que no haya dependencia circular (`DeliveryModule` ya importa cosas de órdenes)
- decidir si la orden debe esperar la entrega (`await`) o no

Es un cambio de arquitectura con más superficie. Recomiendo hacerlo
**después** del parche A, en un commit propio y con pruebas.

---

## 4. Verificación propuesta

1. **Sin cambios de esquema**, así que no hay migración.
2. Prueba manual: crear una orden METRO y, en paralelo, `POST /api/deliveries`
   para el mismo `orderId` (dos llamadas concurrentes).
   - Antes: una responde 500 con `P2002`.
   - Después: ambas responden 200/201 con el mismo `id`.
3. Consulta SQL de control:
   ```sql
   SELECT "orderId", COUNT(*) FROM deliveries GROUP BY "orderId" HAVING COUNT(*) > 1;
   ```
   Debe devolver **0 filas** (el `@unique` ya lo garantiza; sirve como control).
4. Logs: no deben aparecer más `P2002 ... orderId`.

---

## 5. Cómo medir si el bug está activo

En Render → Logs, buscar `P2002`. Cada aparición es un checkout que
terminó en 500 para el cliente. Si aparece seguido, el parche A es urgente;
si es esporádico, sigue siendo un defecto real pero de baja frecuencia.

---

## 6. Resumen

| Aspecto | Valor |
|---|---|
| Archivos | 2 (`delivery.service.ts`, `orders.service.ts`) |
| Líneas | ~30 |
| Migraciones | Ninguna |
| Riesgo | **Bajo** — solo actúa en la ruta de error que hoy da 500 |
| Reversión | `git revert` |
| Bug de fondo (auditoría/Todoist en auto-create) | **Fuera de alcance**, requiere commit aparte |
