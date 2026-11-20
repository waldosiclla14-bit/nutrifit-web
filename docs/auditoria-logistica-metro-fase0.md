# Auditoría · Logística Metro y rol Repartidor (Fase 0)

Fecha: 2026-11-18 · Solo lectura · No se modificó código, esquema ni datos.
Fuentes: código del repo (`backend/src/delivery`, `src/components/admin/Entregas.tsx`), esquema Prisma y consultas **GET** contra la API de producción con la cuenta admin.

---

## 1. Contadores: qué consulta hace cada uno

`src/components/admin/Entregas.tsx` pide dos cosas en paralelo: la lista (`GET /deliveries`) y `GET /deliveries/stats`.

| Contador UI | Implementación real | Campo de fecha | Estados incluidos | Zona horaria | Valor observado |
|---|---|---|---|---|---|
| **Hoy** | `delivery.count({ deliveryDate: { gte: inicio_día_Chile, lt: inicio_día_siguiente } })` | `deliveryDate` | **todos** (incluye `CANCELLED` y `RESCHEDULED`) | Chile, aplicada sobre un instante que está en UTC-medianoche | **0** |
| **Semana** | idem, `gte` = lunes de la semana Chile, `lt` = mañana | `deliveryDate` | todos | igual | **0** |
| **Entregados** | `delivery.groupBy({ by: ['status'] })` → `byStatus['DELIVERED']` | **ninguno** | `DELIVERED` | — | **3** (histórico completo) |
| **Pendientes** | suma del mismo `groupBy` excluyendo `DELIVERED` y `CANCELLED` | **ninguno** | los otros 13 estados (`CREATED`, `PAYMENT_CONFIRMED`, `PREPARING`, `READY`, `SCHEDULED`, `CONFIRMATION_PENDING`, `CONFIRMED`, `IN_ROUTE`, `ARRIVED`, `RESCHEDULED`, `CUSTOMER_UNAVAILABLE`, `NOT_DELIVERED`, `INCIDENT`) | — | **122** (118+3+1, histórico completo) |
| **Mes** (existe en API, no se muestra) | `count({ deliveryDate: { gte: inicio_mes } })` | `deliveryDate` | todos | Chile | 16 |
| **Cierre de hoy** | `GET /orders?status=DELIVERED&paymentStatus=CONFIRMED&updatedFrom=hoy&updatedTo=hoy` | **`updatedAt` de la orden** | orden `DELIVERED` + pago `CONFIRMED` | día del navegador | **0**, con 170 órdenes ya cerradas |
| **Tabla** | `GET /deliveries?...&dateFrom&dateTo` → `rangeBound()` | `deliveryDate` | todos | Chile | rango 16–22 nov → **0 filas** |

Detalles que agravan el cuadro:

- `getStats(query)` **recibe `dateFrom/dateTo` y los ignora** (parámetro muerto). La UI nunca los manda.
- `byStatus` y `topStations` tampoco filtran por fecha: "Entregados" y "Pendientes" son acumulados desde septiembre.
- "Semana" no tiene tope en domingo: usa `lt = mañana`, correcto por casualidad salvo el domingo.
- `RESCHEDULED`, `NOT_DELIVERED` e `INCIDENT` cuentan como "pendientes" aunque sean estados cerrados.

---

## 2. Causa raíz de cada descuadre

### Causa 1 — Desfase de **un día completo**, no de 3 horas (afecta Hoy, Semana, Mes y la tabla)

`Delivery.deliveryDate` se escribe así:

```ts
deliveryDate: order.deliveryDay ? new Date(order.deliveryDay) : null   // orders.service.ts
deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null   // delivery.service.ts
```

`order.deliveryDay` es un `String` `"YYYY-MM-DD"`, así que `new Date()` lo interpreta como **00:00 UTC**. Los rangos de día Chile, en cambio, empiezan a las **03:00Z** (verano) o **04:00Z** (invierno).

Verificado en producción:

| Día | Filas reales | `dateFrom = dateTo = ese día` |
|---|---|---|
| 2026-11-02 | 4 | **2** (devuelve las del 3) |
| 2026-11-16 | 2 | **0** |
| 2026-11-18 (hoy) | 0 | 0 |

El desfase es determinista en los dos regímenes de horario de verano, porque 00:00Z siempre cae en el día Chile anterior. Consecuencias:

- Un pedido agendado para hoy **nunca** aparece en "Hoy": el rango empieza 3–4 horas después de donde está guardado.
- Cada día del filtro devuelve las entregas **del día siguiente**.
- La tabla además **muestra la fecha un día antes**: `2026-11-02T00:00Z` → `toLocaleDateString('es-CL')` → **01-11-2026**.

Los helpers de `common/date-range.ts` están bien hechos y tienen pruebas de DST. El error es que `deliveryDate` no está expresado en términos de día Chile.

### Causa 2 — Contadores sin fecha (afecta Entregados y Pendientes)

No tienen ninguna condición de fecha. "Pendientes 122" es el arrastre histórico desde el 5 de septiembre. Coincide exacto con `byStatus` real: 118 `CREATED` + 3 `PAYMENT_CONFIRMED` + 1 `CONFIRMATION_PENDING`.

### Causa 3 — Dos fuentes de verdad: `Order.status` vs `Delivery.status` (la más grave)

| Medición en producción | Valor |
|---|---|
| Órdenes `deliveryType = METRO` | 168 |
| Filas en `deliveries` | 125 |
| Órdenes METRO **sin** fila de entrega | **43** |
| Órdenes `DELIVERED` con `delivery` en `CREATED` | **119** |
| Órdenes `DELIVERED` con `delivery` en `DELIVERED` | **3** |

El POS crea la orden ya pagada/entregada y después crea la entrega dejándola en `PAYMENT_CONFIRMED` (máximo). Nadie vuelve a tocar la fila de entrega. El módulo "Logística Metro" es, en la práctica, **un libro paralelo que solo concuerda en 3 de 122 casos**.

Además, `autoCompleteOrder()` —lo único que cierra una orden desde una entrega— **retorna sin hacer nada si la orden no está en `READY` o `PREPARING`**, así que marcar "Entregado" en una orden `PAID` o `AGENDADO` no genera venta ni movimientos de stock.

### Causa 4 — "Cierre de hoy" mide `updatedAt`

Cualquier edición de la orden (cambiar una nota, reasignar, corregir un teléfono) la hace contar como "venta cerrada hoy". Y una venta cerrada ayer a las 22:00 Chile cae en el día UTC siguiente. No usa `paidAt` ni `deliveredAt`. Hoy hay 2 órdenes tocadas y ninguna cumple el filtro → 0.

### Causa 5 (fuera del módulo, pero rompe el criterio 21:00–00:00) — Ventas del dashboard en hora del servidor

`orders.getStats()` usa `new Date(); today.setHours(0,0,0,0)` con el reloj del servidor, que en Render es **UTC**. El "día de ventas" del dashboard cambia a las **21:00 de Chile**, y `salesByDay` usa `DATE("createdAt")` en SQL, también UTC. La logística corregida quedaría cuadrada internamente pero no contra el dashboard.

---

## 3. Estados existentes

`enum DeliveryStatus` tiene **15** valores. Transiciones válidas (`delivery.service.ts`):

```
CREATED → PAYMENT_CONFIRMED → PREPARING → READY → SCHEDULED → CONFIRMATION_PENDING
        → CONFIRMED → IN_ROUTE → ARRIVED → DELIVERED
CANCELLED desde casi todos; RESCHEDULED desde SCHEDULED/CONFIRMED;
CUSTOMER_UNAVAILABLE, NOT_DELIVERED e INCIDENT solo desde IN_ROUTE/ARRIVED.
```

Mapeo al modelo pedido (8 estados):

| Modelo pedido | Estado actual | Observación |
|---|---|---|
| Agendado | `SCHEDULED` (o `CREATED` si nadie avanzó) | dos estados dicen lo mismo |
| Confirmado | `CONFIRMATION_PENDING` / `CONFIRMED` | duplicado |
| **Asignado** | **no existe** | solo el campo `assignedTo`, sin estado |
| En ruta | `IN_ROUTE` | ok |
| Entregado | `DELIVERED` | ok |
| No entregado | `NOT_DELIVERED` / `CUSTOMER_UNAVAILABLE` / `INCIDENT` | 3 estados para lo mismo |
| Reprogramado | `RESCHEDULED` | es estado **y** acción (`/reschedule`) |
| Cancelado | `CANCELLED` | ok |

Problemas concretos:

- El flujo lineal tiene **9 saltos** para llegar a entregado. Un repartidor no puede hacerlo en 4 toques, y desde `CREATED` ni siquiera puede llegar a `IN_ROUTE`.
- `assignedTo` es un `String?` **sin relación a `User`** en Prisma: no hay join, no se puede listar "mis entregas" ni agrupar por repartidor.
- En producción: **0 de 125** entregas tienen `assignedTo`.

---

## 4. Rol "Repartidor Metro / Logística"

### 4.1 Estado real

- El rol `DELIVERY` **existe** en el enum `Role`, y el JWT lo transporta.
- **No hay ningún usuario con ese rol**: en producción solo hay 1 `ADMIN` y 1 `SELLER`.
- El texto "Repartidor Metro / Logística" que aparece en Configuración es un `<span>` decorativo; no crea usuarios ni permisos.
- **No existe ruta ni pantalla de repartidor.** No hay `/repartidor`, `/ruta` ni equivalente: todo vive en `/admin`, un panel con ~20 pestañas.

### 4.2 RBAC en el servidor

Sí está en el servidor, en el decorador de clase de cada controlador. `RolesGuard` devuelve `false` si el rol del token no está en la lista → 403.

| Recurso | Roles permitidos | DELIVERY |
|---|---|---|
| `deliveries` (toda la logística) | ADMIN, SELLER | **403** |
| `orders` | ADMIN, SELLER | **403** |
| `products` | ADMIN, SELLER | **403** |
| `customers` (CRM) | ADMIN, SELLER | **403** |
| `finances`, `ai`, `audit`, `config`, `users`, `coupons` | ADMIN | **403** |
| `purchases`, `suppliers`, `stock-adjustments`, `cash-register` | ADMIN/SELLER | **403** |
| `metro-stations` (PATCH) | ADMIN | **403** |
| `push` (suscribir) | ADMIN, SELLER, **DELIVERY** | 200 |
| `auth/me`, `auth/change-password` | cualquiera autenticado | 200 |
| `GET metro-stations`, `reviews`, `ping` | **sin guard (público)** | 200 |

Conclusión: **del lado servidor el repartidor está bien bloqueado, y también está bloqueado de todo lo que necesita.** No es un problema de permisos de más: es que no existe la superficie de permisos de menos (leer su ruta, marcar estados, cobrar).

No pude ejecutar la prueba en vivo de "403 en endpoints restringidos" porque no existe un usuario `DELIVERY` y crearlo en Fase 0 violaría el modo solo lectura. La prueba queda especificada para Fase 2.

### 4.3 RBAC en la interfaz

No existe. `src/proxy.ts` solo comprueba que la cookie `nf_session` exista (es un booleano, no el rol). Un repartidor que entre a `/admin` **ve todo el panel** y cada llamada le devuelve 403 → pantallas vacías y errores. Tampoco hay cierre por inactividad ni PIN: el login es email+contraseña y la sesión dura **7 días** (JWT y cookie).

### 4.4 Datos del cliente y de costos que expone la API a ese rol

Hoy: **ninguno**, porque no accede a nada.

Lo que expondría el endpoint de logística si se le abriera tal cual (`findAll` incluye `order` y `customer`): nombre, teléfono, `order.total`, estación, comuna, punto de encuentro, código de entrega. `findOne` incluye además `customer` completo (`email`, `rut`, `notes`, `totalSpent`, `isVip`) e `items` del pedido. No expone `totalCost` ni `profit` (esos viven en `/orders`, bloqueado).

Riesgo a corregir en Fase 2: `findOne` entrega la ficha completa del cliente; hay que proyectar a nombre, teléfono, estación y hora.

---

## 5. PWA

| Pieza | Estado |
|---|---|
| Manifest web | `src/app/manifest.ts` (tienda) |
| Manifest admin | `/admin.webmanifest` (start_url `/admin`, standalone, íconos 192/512/maskable) |
| Manifest POS | `/pos.webmanifest` |
| Íconos | 3 PNG en `public/icons` (1,5–5 KB) |
| Service worker | `public/sw.js`, registrado por `src/components/layout/PWA.tsx` **solo en producción** |
| Web Push | Implementado: VAPID, `/push/subscribe`, `push` + `notificationclick` en el SW. Ya permite rol `DELIVERY` |
| Caché offline | Precarga 4 URLs; navegación network-first con fallback a `/` cacheado. **No cachea el shell de `/admin` ni la ruta del día** |
| Cola offline | **No existe**: ni IndexedDB, ni Background Sync, ni reintentos |
| API en caché | Correcto: las peticiones no-GET y `/api` se dejan pasar |
| Geolocalización | **Bloqueada** por `Permissions-Policy: geolocation=()` en `next.config.mjs` |
| Cámara | Permitida (`camera=(self)`) |
| Subida de archivos | **No hay endpoint de upload.** Los documentos existentes se guardan en base64 dentro de la BD (deuda conocida) |
| Instalable | Probablemente sí (manifest + SW + HTTPS), pero no hay una PWA de repartidor: la instalable es el panel de 20 pestañas |

---

## 6. Duplicados por reintentos

| Punto | Estado |
|---|---|
| Creación de orden | **Protegido**: `orders.idempotencyKey @unique` + consulta previa; POS y checkout envían UUID |
| Creación de entrega | **Protegido**: `deliveries.orderId @unique`, `findUnique` previo y captura de `P2002` |
| Cambio de estado | **Protegido por la máquina de estados** (un segundo `DELIVERED` no es transición válida) |
| `verifyCode` | Verifica y delega en `updateStatus`, pero **sin `userId`**: la auditoría de esa entrega queda sin actor |
| `assign` | **No** registra quién asignó (el `userId` del actor no se pasa a la auditoría) |
| `autoCompleteOrder` | Se lanza **sin `await`**: si falla, la entrega queda `DELIVERED` y la orden no. Además se salta órdenes `PAID`/`AGENDADO` |
| Cobros / evidencia | **No existen**: no hay `cobros_entrega` ni `rendiciones`, así que hoy no hay forma de detectar un doble cobro |
| Acciones offline futuras | Sin clave de idempotencia → Fase 5 la necesita por acción |

---

## 7. Configuración: hoy no hay fuente única (regla 6)

| Valor | Dónde vive | Editable |
|---|---|---|
| Costo de entrega Metro | `src/lib/policies.ts` → `SHIPPING_METRO_FEE = 1000` | No |
| Costo de entrega en POS | `useState(1000)` en `Pos.tsx` | Sí, por venta |
| "Costo Entrega Metro Estándar" en Configuración | `useState('2500')` | **No: `handleSave` solo muestra un toast.** El formulario no persiste nada |
| Ventana horaria (08:00–22:00), intervalo de slot, máximo por slot | tabla `deliverySettings` | **No hay UI**, y `syncScheduleWindow()` **sobrescribe los valores en cada arranque** ("code owns the values") |
| Estaciones | tabla `metroStations`, seed versionado | Solo por API (`PATCH`, admin); sin UI |

Es decir: el mismo dato de negocio tiene tres valores distintos y ninguno gobernable desde Configuración.

---

## 8. Plan priorizado y esfuerzo

Estimación para 1 desarrollador senior, incluyendo pruebas y migración de datos. Sin cambio de proveedor ni de base de datos.

| Fase | Alcance | Esfuerzo |
|---|---|---|
| **0.5 · Higiene de datos** | Normalizar las 125 filas de `deliveries.deliveryDate` a "inicio del día Chile" y backfill de las 43 órdenes METRO sin fila. Idempotente, reversible, sin cambio de esquema | **0,5 día** |
| **1 · Fuente única** | `getDeliveries(filtros)` único para contadores y tabla; fecha de entrega como día Chile en un solo helper; enum de estados con `esPendiente/esFinal/esActivoHoy`; Vencidos aparte; contadores con fecha y excluyendo cancelados; ORDER BY estación → ventana; pruebas de medianoche y DST | **2,5–3 días** |
| **2 · RBAC servidor** | Endpoints propios del repartidor (`/repartidor/ruta`, `/repartidor/entregas/:id/estado`, `/repartidor/rendicion`), filtrado por `assignedTo` en servidor, proyección de PII, FK `assignedTo → User`, auditoría con actor, PIN + bloqueo por inactividad, tests de 403 | **2 días** |
| **3 · PWA del repartidor** | Ruta `/repartidor` con 3 pestañas, tarjetas por estación, acciones rápidas (WhatsApp/llamar/mapa), detalle con 2 botones grandes, rendición y cierre de día, estados vacíos | **4–5 días** |
| **4 · POD y efectivo** | `cobros_entrega` y `rendiciones` (3 tablas nuevas), código/foto, caja del repartidor separada del POS, confirmación del admin con diferencia, generación de la venta reutilizando la función existente | **3–4 días** |
| **5 · Sin señal** | IndexedDB + cola ordenada con idempotencia por acción, indicador de pendientes, resolución de conflictos, shell offline | **3–4 días** (riesgo alto) |
| **6 · Panel admin de logística** | Despacho con asignación, contadores clicables, vencidos, diferencias, KPIs, CSV, push al asignar | **2–3 días** |
| | **Total** | **17–21 días** |

### Decisiones que necesito de ti antes de la Fase 1

1. **Fecha de entrega**: propongo que `deliveryDate` guarde el **inicio del día Chile** (03:00Z/04:00Z) y añadir `deliveryDay String` (copia de `Order.deliveryDay`) para mostrar sin ambigüedad. La migración toma el día UTC actual como el día previsto — es lo que el usuario eligió al agendar.
2. **Backfill de las 43 órdenes METRO sin fila de entrega**: ¿las creo desde los datos reales de la orden o las dejo fuera? Sin fila no pueden aparecer en la ruta de nadie.
3. **Las 119 órdenes `DELIVERED` con entrega en `CREATED`**: ¿las cierro como `DELIVERED` (asumiendo que el POS ya las cobró) o las dejo como están y solo corrijo de aquí en adelante?
4. **Evidencia de entrega**: sin endpoint de subida. Puedo (a) guardar base64 en la BD con límite de tamaño, reutilizando el patrón existente, o (b) abrir un proveedor de almacenamiento — esto último choca con la regla de no cambiar de proveedor.
5. **Alcance del cambio de zona horaria del dashboard**: corregir `orders.getStats()` a día Chile toca números que ya se ven en pantalla. ¿Lo incluyo en Fase 1 o va aparte?
