# PWA de Reparto (Fases 3 y 4)

App exclusiva del rol `DELIVERY`. Instalable, pantalla completa y con tres
pestañas. No reemplaza al panel admin: `DELIVERY` sigue recibiendo 403 en
`/products`, `/orders`, `/customers`, `/config`, etc.

## Acceso

1. Un admin asigna el PIN: `PATCH /api/users/:id/pin` con `{ "pin": "1234" }`.
2. El repartidor abre `/login?next=/reparto` y elige la pestaña **Repartidor**.
3. `POST /api/auth/pin` deja la cookie HttpOnly y redirige a `/reparto`.
4. Si `courier_tomorrow_enabled` está en `false`, la pestaña **Mañana** no
   aparece y el backend también responde 403.

## Pestañas

| Pestaña | Contenido | Endpoint |
|---------|-----------|----------|
| Ruta | Entregas de hoy/mañana agrupadas por estación, detalle y cambio de estado | `GET /courier/route`, `GET /courier/route/:id`, `PATCH /courier/route/:id/status`, `POST /courier/route/:id/deliver`, `POST /courier/route/:id/reschedule` |
| Rendición | Recaudado por método, arqueo declarado y cierre del día | `GET /courier/rendicion`, `POST /courier/rendicion/cerrar` |
| Perfil | Sesión, minutos de inactividad, instalar app, cerrar sesión | `GET /courier/config` |

## Cierre de entrega con POD (Fase 4)

`PATCH .../status` con `DELIVERED` ya **no existe** para el repartidor: el
backend responde 400 y apunta al nuevo endpoint. La hoja de entrega abre un
formulario con:

- **Monto y medio de cobro**. El servidor exige que `amount` sea exactamente
  `Order.total` (o 0 si `paymentStatus = CONFIRMED`) y que `method` sea un
  `PaymentMethod` válido. No se puede cobrar de más ni de menos.
- **Evidencia**: código de entrega (`Delivery.deliveryCode`) y/o foto. La foto
  se comprime en el cliente (máx. 1280 px, JPEG) y se valida en el servidor
  como data URL de imagen, con tope de ~1,5 MB.
- Opcionalmente referencia, nombre de quien recibe y notas.

El backend graba `delivery_collections` + `delivery_proofs` (uno por entrega,
índice único) y **recién después** llama a `DeliveryService.updateStatus`, que
sigue siendo el único lugar que cierra la orden, descuenta stock, audita y
genera snapshots. Si ese cierre falla, se borran cobro y prueba para permitir
el reintento. Un reintento con cobro existente devuelve `idempotente: true` sin
volver a cobrar.

## Caja del repartidor (Fase 4)

La rendición es **independiente del POS**: nunca escribe `cash_registers` ni
`cash_movements`. Vive en `courier_cash_shifts`, única por repartidor + día
Chile (`YYYY-MM-DD`).

- Mientras haya entregas pendientes no se puede cerrar.
- El repartidor declara efectivo, transferencia y otros medios (precargados con
  lo recaudado) y puede ajustarlos; se calcula `diferencia = declarado - esperado`.
- `POST /courier/rendicion/cerrar` solo permite el día de hoy y pasa el turno a
  `RENDIDA`. No se puede reabrir desde la PWA.
- `GET /courier/rendicion` muestra montos reales de cobros cuando existen;
  para entregas históricas sin cobro mantiene el cálculo preliminar de la Fase 3.

### Confirmación admin

Nueva pestaña **FINANZAS & CONTROL → Rendiciones reparto** (`/admin`):

| Endpoint | Uso |
|----------|-----|
| `GET /courier/rendiciones?day=&status=` | Listado del día (ADMIN/SELLER) |
| `GET /courier/rendiciones/:id` | Detalle con cobros, evidencia y foto disponible |
| `GET /courier/rendiciones/:id/proof/:deliveryId` | Imagen de la prueba (solo del turno y repartidor correctos) |
| `POST /courier/rendiciones/:id/confirm` | Confirma con montos opcionalmente ajustados y registra `confirmedById` |

La confirmación guarda la diferencia final y escribe `AuditLog`
(`CASH_SHIFT_CONFIRMED`) con el actor. Un turno `RENDIDA` solo se confirma una
vez; estados `ANULADA`/`CONFIRMADA` no se pueden confirmar de nuevo.

## Reglas

- Solo se ven entregas con `assignedTo = usuario autenticado`. Una entrega
  ajena devuelve 404 (no 403) para no revelar que existe.
- El repartidor no puede cancelar, reprogramar por sí solo ni volver a estados
  de preparación. Cerrar sin éxito exige motivo (3+ caracteres).
- La solicitud de reprogramación solo crea un `DeliveryAuditLog`
  (`RESCHEDULE_REQUESTED`) y avisa al admin.
- Cierre por inactividad: `courier_idle_minutes` (Configuración, por defecto 15).
- Sin conexión se muestra un aviso y los botones de estado fallan con mensaje.
  La cola offline idempotente llega en la Fase 5.

## PWA

- Manifest: `/reparto.webmanifest` (`start_url` e `id` = `/reparto`).
- Service worker: `public/sw.js` (el mismo del sitio).
- Instalación: botón en **Perfil** cuando el navegador dispara
  `beforeinstallprompt` (Chrome/Edge Android). En iOS se usa “Añadir a inicio”.
