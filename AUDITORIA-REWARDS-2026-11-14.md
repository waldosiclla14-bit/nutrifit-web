# NUTRIFIT REWARDS — Auditoría técnica (Fase 1)

Fecha: 2026-11-14
Alcance: auditoría de solo lectura. No se modificó código, esquema, checkout ni variables de entorno.
Repositorio: `waldosiclla14-bit/nutrifit-web` (rama `main`, HEAD `c69db52`).

---

## 0. Veredicto ejecutivo

El proyecto **sí es viable** para NUTRIFIT REWARDS, pero **no como está descrito en el prompt**.

Tres hallazgos cambian el plan:

1. **No existe Supabase en el proyecto.** No hay SDK, cliente, claves ni referencias. La base es PostgreSQL (Neon) accedida **exclusivamente** por un backend NestJS + Prisma. Las políticas RLS tipo Supabase para "participantes" **no se pueden implementar como se pide**.
2. **Los clientes no tienen autenticación.** Solo existen usuarios internos (`User`, roles ADMIN/SELLER/DELIVERY). No hay login de cliente, ni `/mi-cuenta`, ni verificación de teléfono/email. El panel `/mi-cuenta/rewards` no puede "integrarse con la autenticación existente" porque no hay tal autenticación.
3. **La tienda pública no lee el catálogo de la base de datos.** Productos, precios y stock están hardcodeados en `src/data/seed.ts`. El pedido web se guarda primero en `localStorage` y se envía a WhatsApp; el envío al backend es best-effort y **hoy es altamente probable que falle** por integridad referencial (detalle en L.1). Sin pedidos web confiables no hay atribución confiable.

Adicional: el sistema de cupones actual es **mono-uso, atado al teléfono del cliente, solo porcentual y sin restricciones por producto/categoría**. No sirve tal cual para códigos de referido compartidos.

**Recomendación:** aprobar el diseño, pero resolver primero 3 decisiones de negocio/técnicas (§ Decisiones requeridas) antes de la Fase 3.

---

## A. Arquitectura actual

Monorepo con dos aplicaciones desplegadas por separado:

```
nutrifit-web/
├── src/                     Next.js 16.3 (App Router) — Vercel
│   ├── app/(public)/        tienda: home, productos, blog, legal, marcas, favoritos…
│   ├── app/(admin)/         /admin (dashboard), /login, /pos
│   ├── components/admin/    16 paneles lazy
│   ├── components/layout/   CartDrawer, Header, Footer…
│   ├── context/CartContext  carrito en memoria/localStorage
│   ├── lib/api.ts           apiFetch + proxy /erp/*
│   └── data/seed.ts         catálogo hardcodeado (71 KB)
├── backend/                 NestJS 11 + Prisma 5.8 — Render
│   ├── src/<módulo>/        auth, users, customers, products, orders, coupons,
│   │                        cash-register, audit, config, delivery, purchases,
│   │                        inventory, finances, reviews, reminders, push, ai…
│   └── prisma/schema.prisma 1.003 líneas, 40+ modelos
└── public/
```

Flujo de red:

- Navegador → `NEXT_PUBLIC_API_URL` (`https://nutrifit-api-635n.onrender.com`) o mismo origen vía rewrite `/erp/:path*` → `${API}/api/:path*` (`next.config.mjs`).
- El rewrite existe para que la cookie JWT (`access_token`, HttpOnly) sea first-party.
- Backend: prefijo global `api`, CORS restringido, Swagger deshabilitado en producción, `ThrottlerGuard` global (30 req/min) + límites por endpoint.

No hay pasarela de pago, ni webhooks de pago, ni workers/colas. El pago se confirma **manualmente** por un vendedor/admin.

---

## B. Tecnologías y versiones (verificadas)

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Next.js (App Router) | 16.3 |
| Frontend | React / React DOM | 19.0 |
| Frontend | TypeScript | 5.7 |
| Frontend | Tailwind CSS | 3.4 |
| Frontend | Framer Motion | 12.4 |
| Frontend | Recharts / Lucide / Sonner | 3.10 / 0.525 / 2.0 |
| Frontend | xlsx / html5-qrcode / barcode-detector | 0.18 / 2.3 / 3.2 |
| Tests FE | Jest 29 + Testing Library | — |
| Backend | NestJS | 11.1.28 |
| Backend | Prisma Client / CLI | 5.8 |
| Backend | PostgreSQL | Neon, pooler (`DATABASE_URL`) + directo (`DIRECT_URL`) |
| Backend | Auth | `@nestjs/jwt` + passport-jwt, bcryptjs |
| Backend | Validación / Swagger / Throttler | class-validator / 11.4 / 6.5 |
| Deploy | Vercel (FE) + Render (BE) | — |

Variables relevantes: `NEXT_PUBLIC_API_URL`, `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGINS`, `WEBHOOK_SECRET`, `VAPID_*`, `NEXT_PUBLIC_FINANZAS_ENABLED`.

No existe `SUPABASE_URL`, `SUPABASE_ANON_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` en ningún `.env.example` ni en el código.

---

## C. Estructura real del dashboard

`src/app/(admin)/admin/page.tsx` define `TabKey` y renderiza componentes lazy:

| Tab | Componente | Datos |
|---|---|---|
| resumen | `Resumen.tsx` | API real |
| ordenes | `Ordenes.tsx` | API real |
| entregas | `Entregas.tsx` | API real |
| calendario | `Calendario.tsx` | API real |
| productos | `Productos.tsx` | API real |
| inventario | `Inventario.tsx` | API real |
| compras | `Compras.tsx` | API real |
| proveedores | `Proveedores.tsx` | API real |
| clientes | `Clientes.tsx` | API real |
| desk | `Desk.tsx` | API real |
| marketing | `Marketing.tsx` | **datos falsos `SAMPLE_COUPONS`** |
| caja | `Caja.tsx` | API real |
| finanzas | `Finanzas.tsx` | API real, tras flag `NEXT_PUBLIC_FINANZAS_ENABLED` |
| reportes | `Reportes.tsx` | API real (`/orders/reports`) |
| ia | `IaCopilot.tsx` | API real |
| configuracion | `Configuracion.tsx` | API real |

Navegación: sidebar desktop + `BottomNav.tsx` (mobile sheet), iconos Lucide, paleta `sport-*`.

Hallazgos relevantes:

- **`Marketing.tsx` es maqueta**: `SAMPLE_COUPONS` hardcodeados, botones que solo abren modales locales. `GET /coupons` en backend devuelve `[]` siempre (`coupons.controller.ts:33`). No existe administración real de cupones.
- **`Clientes.tsx` genera cupones reales** vía `POST /coupons`, pero ese endpoint exige `Role.ADMIN`. Si un SELLER entra a Clientes, recibirá 403. Verificar política de roles antes de sumar Rewards.

---

## D. "Tablas reales de Supabase" → corrección

No hay tablas de Supabase. Son tablas PostgreSQL administradas por Prisma. Las existentes y relevantes:

| Tabla | Modelo | Rol en Rewards |
|---|---|---|
| `customers` | `Customer` | identidad comercial del participante/comprador |
| `orders` | `Order` | pedido; hoy sin vínculo de referido |
| `order_items` | `OrderItem` | líneas, costo y margen |
| `coupons` | `Coupon` | cupón legado (teléfono, mono-uso, %) |
| `users` | `User` + enum `Role` | staff (ADMIN/SELLER/DELIVERY) |
| `audit_logs` | `AuditLog` | trazabilidad de acciones de staff |
| `config` | `Config` | clave/valor para parámetros |
| `products`, `product_variants` | — | precios, costos, stock |
| `categories`, `brands` | — | restricciones por categoría |
| `cash_registers`, `cash_movements` | — | caja/POS |
| `deliveries`, `delivery_audit_logs` | — | logística Metro |
| `inventory_movements` | — | auditoría de stock |
| `finances` (gastos) | — | P&L, útil para margen |

Enums relevantes: `Role`, `OrderStatus` (PENDING, CONFIRMED, PAID, PREPARING, READY, DELIVERED, CANCELLED, RETURNED, AGENDADO), `PaymentStatus` (PENDING, CONFIRMED, REJECTED, REFUNDED), `PaymentMethod` (TRANSFERENCIA, EFECTIVO, FLOW_MANUAL, MERCADOPAGO_MANUAL, TARJETA_MANUAL, MIXTO), `DeliveryType`, `MovementType`.

**Nota sobre RLS:** la migración `20261002_enable_rls_lockdown` ya activó RLS en todas las tablas de `public`, revocó todo a `anon`/`authenticated`, revocó privilegios por defecto y creó un event trigger `enable_rls_on_create` que activa RLS automáticamente en cada tabla nueva. El backend Prisma conecta como rol con BYPASSRLS (postgres). Es decir: **la base ya está cerrada a acceso directo; toda autorización pasa por NestJS.** Esto es bueno y debe mantenerse.

---

## E. Relaciones reales

```
Customer 1─N Order 1─N OrderItem N─1 Product/Variant
Customer 1─N Coupon (opcional)
Order.couponCode ──(texto, SIN FK)── Coupon.code
Order 1─1 Delivery
Order 1─N InventoryMovement
User 1─N Order (createdBy)
User 1─N AuditLog
Config (key/value)
```

Puntos críticos:

- `Order.couponCode` es **string libre**, no FK. No se puede garantizar integridad ni consultar por cupón con índice.
- `Coupon.customerPhone` es **obligatorio** y la validación exige que el teléfono del comprador coincida (`coupons.service.ts:97`). Un código compartido por un referidor **no funcionaría** con la lógica actual.
- `Coupon`: solo `discountPercent` (1–90), `expiresAt`, `usedAt`, `usedOrderId`, `isActive`. Sin tipo fijo, sin límite de usos, sin restricciones por producto/categoría, sin mínimo de compra.
- `Customer.phone` **no es único** (hay `findFirst` por teléfono y `create` hace upsert manual por teléfono). Esto impide una identidad de participante limpia sin deduplicación previa.
- No existe ninguna relación de referidos, comisiones ni pagos.

---

## F. Flujo de checkout actual (real)

1. `Catalog.tsx` y `BundleOffers.tsx` leen `PRODUCTS`/`BUNDLES` desde `src/data/seed.ts` (ids numéricos: 4, 6, 7…, precios y stock locales).
2. Carrito en `CartContext` (memoria + `localStorage`). Los descuentos se calculan en el navegador (`couponDiscount`, `rewardDiscount`, `activeDiscount`).
3. Al aplicar cupón: `POST /api/coupons/validate` con `{ code, phone, subtotal }`. El backend valida teléfono y vigencia y devuelve `discountPercent`.
4. Al confirmar (`CartDrawer.checkout`):
   - Guarda el pedido en `localStorage` (`saveOrder`) — **fuente de verdad para la UI**.
   - Abre WhatsApp con el mensaje del pedido.
   - Dispara `submitStoreOrder(order)` en paralelo, sin bloquear la UI.
5. `submitStoreOrder` (`src/lib/api.ts:273`):
   - `POST /api/customers/public` → crea/actualiza `Customer` por teléfono.
   - `POST /api/orders/public` con `paymentMethod: 'EFECTIVO'` fijo, `deliveryType` según método, items mapeados.
6. Backend `OrdersService.create`:
   - Valida payload, tipo de entrega y método de pago.
   - Idempotencia por `idempotencyKey` único.
   - Solo valida items **con `variantId`**: existencia, stock y precio exacto contra BD.
   - Recalcula subtotal desde precios enviados (no desde BD si no hay variante).
   - Si hay cupón: valida por teléfono, recalcula descuento, y **consume el cupón ANTES** de crear la orden (llamada separada, fuera de la transacción).
   - Reserva stock con `UPDATE ... WHERE stock - reservedStock >= qty`, crea la orden en `$transaction` no interactiva (compatible pgbouncer), reintenta `orderNumber` hasta 3 veces.
   - Nace `status=PENDING`, `paymentStatus=PENDING`.

Problemas del checkout que impactan Rewards:

- **Doble sistema de pedidos:** `localStorage` + WhatsApp + BD. Si el envío al backend falla, la UI dice "pedido realizado" y no hay orden en BD → no hay atribución.
- **Precios y catálogo hardcodeados:** el admin modifica productos en BD y la tienda no cambia.
- **Riesgo de integridad:** `productId` enviado es `i.variantId ?? i.productId` (`api.ts:316`). Para productos sin variante se envía el id numérico del seed a una FK `OrderItem.productId → products.id` (UUID). Es probable que el insert falle y la orden nunca se persista. Debe verificarse en producción con un pedido real (no se ejecutó nada en esta auditoría).
- **Precios no validados sin variante:** si `variantId` es null, el backend acepta `unitPrice` arbitrario. Un cliente podría crear pedidos a precio inventado. Afecta descuentos, márgenes y comisiones.
- **Cupón huérfano:** se consume antes de la transacción; si la orden falla, el cupón queda usado sin pedido.
- **Sin pago online:** `EFECTIVO` fijo. No existe webhook ni confirmación automática.
- **No hay campo de referido** en el carrito ni en `/orders/public`.

---

## G. Confirmación de pagos

- Único mecanismo: `PATCH /api/orders/:id/payment` (ADMIN/SELLER) → `confirmPayment`.
- También `PATCH /api/orders/:id/status` con `PAID`.
- `confirmPayment` (idempotente por guard atómico `paymentStatus != CONFIRMED`):
  - Descuenta stock físico y reserva.
  - Marca `paymentStatus=CONFIRMED`, `status=PAID`, `paidAt`.
  - Incrementa `Customer.totalSpent/totalOrders`.
  - Crea `CashMovement` si hay caja y pago EFECTIVO.
  - Escribe `AuditLog` (`PAYMENT_CONFIRMED`).
- **No hay webhooks de pago.** El único webhook del sistema es de notificaciones push, protegido por `WEBHOOK_SECRET`.
- Devoluciones: solo **totales** (`PATCH /orders/:id/return`), sin reembolso parcial. Pasan a `RETURNED` + `REFUNDED`, reponen stock, revierten contadores del cliente y registran egreso de caja si el turno sigue abierto.
- **No existe contracargo ni reembolso parcial** en el modelo. Habrá que agregarlos o documentar la limitación.

Conclusión: el punto correcto para generar comisión es **`confirmPayment` / transición a PAID**, nunca la creación del pedido. Y debe convivir con `returnOrder` y `updateStatus(CANCELLED)`.

---

## H. Roles y "políticas RLS"

Situación real:

- Autenticación **solo de staff**: `POST /auth/login` → JWT en cookie HttpOnly `access_token`; `JwtAuthGuard` lee cookie o Bearer; `RolesGuard` valida `@Roles(...)`.
- Roles: `ADMIN`, `SELLER`, `DELIVERY`. No hay rol de cliente/participante.
- `GET /products` y `GET /products/:idOrSlug` son públicos.
- `POST /customers/public` público, throttled 5/min.
- `POST /orders/public` público, throttled 5/min.
- `POST /coupons/validate` público, throttled 10/min.
- RLS de PostgreSQL: activo en todas las tablas, `anon`/`authenticated` sin privilegios, event trigger para tablas nuevas. El frontend **nunca** accede a la base.
- No hay funciones SQL de negocio ni triggers de lógica (solo el de RLS).

Implicancia para el prompt: "implementar y probar RLS en todas las tablas nuevas" se traduce, en esta arquitectura, a:

1. Mantener el lockdown (ya existe) y verificar que las tablas nuevas nazcan cerradas (el event trigger lo hace).
2. Implementar **autorización de participante en NestJS**: un guard nuevo que resuelva la identidad del participante y restrinja toda consulta a `profileId = participante autenticado`.
3. Probar acceso cruzado a nivel de servicio/HTTP (no a nivel de SQL policy).
4. Opcionalmente, si se quisiera defensa en profundidad, agregar políticas RLS reales para un rol `authenticated` — pero eso exigiría exponer la base o emitir JWT de Supabase, lo que **no** corresponde a esta arquitectura. No se recomienda.

---

## I. Componentes reutilizables

Backend:

- `OrdersService` (creación, pago, devolución, reportes), `CouponsService`, `CustomersService`, `AuditService`, `ConfigService` (key/value), `UsersService`, guards/decoradores, `PrismaService`, `Throttle`, patrón de `$transaction` no interactiva + guardas P2025.
- `getReports` ya entrega ventas, margen, medios de pago y top productos: base para reportes de Rewards.

Frontend:

- `admin/page.tsx` (TabKey), `BottomNav`, patrón de panel lazy con `Suspense`.
- `apiFetch`, `feedback.tsx` (`toast`, `ConfirmProvider`), `formatPrice`, `charts.tsx`, `OrderStatusBadge`, `ErrorGuard`.
- `CartContext`, `CartDrawer` (punto de integración del código).
- `Productos.tsx` y `Clientes.tsx` como referencia de tablas, filtros, modales y exportación.

Diseño:

- Tokens `sport-*` (verde `#5DD62C`, superficies oscuras, bordes, tipografía display). Se debe respetar este sistema, no imponer la paleta del prompt.

---

## J. Archivos que se deben modificar / crear

### Modificar (mínimo necesario)

| Archivo | Cambio |
|---|---|
| `backend/prisma/schema.prisma` | nuevas tablas/enums; columnas en `Coupon`; relación en `Order` |
| `backend/prisma/migrations/*` | migración reversible nueva |
| `backend/src/orders/orders.service.ts` | validar/registrar atribución; generar comisión en `confirmPayment`/`updateStatus(PAID)`; anular en cancel/return; snapshot |
| `backend/src/orders/orders.controller.ts` | aceptar `referralCode` en `/orders/public`; endpoints admin de ventas referidas |
| `backend/src/coupons/coupons.service.ts` | extender validación (tipo fijo/%, límites, restricciones, teléfono opcional) sin romper cupones legados |
| `backend/src/app.module.ts` | registrar `RewardsModule` |
| `backend/src/customers/customers.service.ts` | normalizar/deduplicar teléfono; vínculo con perfil |
| `src/components/layout/CartDrawer.tsx` | campo "código de referido", validación con feedback, persistencia |
| `src/context/CartContext.tsx` | estado y cálculo del descuento de referido |
| `src/lib/api.ts` | enviar `referralCode` en `submitStoreOrder`; validar código |
| `src/app/(admin)/admin/page.tsx` | tab `rewards` |
| `src/components/admin/BottomNav.tsx` | acceso mobile |

### Crear

- `backend/src/rewards/` — `rewards.module.ts`, `rewards.controller.ts`, `rewards.service.ts`, `referral-codes.service.ts`, `commissions.service.ts`, `payouts.service.ts`, `rewards.dto.ts`, `participant-auth.guard.ts`, specs.
- `backend/src/rewards/commission-calculator.ts` — función pura y testeable.
- `src/components/admin/Rewards.tsx` (+ subcomponentes `RewardsResumen`, `RewardsParticipantes`, `RewardsCodigos`, `RewardsVentas`, `RewardsComisiones`, `RewardsReportes`).
- `src/app/(public)/mi-cuenta/rewards/page.tsx` y su cliente.
- `src/app/(public)/academia/page.tsx` (Fase posterior).
- `src/lib/rewards.ts` (tipos, formato, cliente API).
- `src/types/rewards.ts`.
- `docs/rewards-*.md` (reglas comerciales, T&C borrador, runbook de pagos).

### No tocar sin necesidad

Checkout en su lógica de precios, POS, delivery, purchases, OCR, finanzas, autenticación de staff.

---

## K. Nuevas tablas necesarias (propuesta revisada)

Se mantienen las 6 del prompt, con correcciones de integridad. **No** se crean tablas de clientes, pedidos ni cupones nuevas.

### `referral_profiles`
```
id uuid PK
customerId uuid UNIQUE NULL → customers(id)   -- vínculo al CRM
participantType enum CLIENTE_REFERIDOR | EMBAJADOR | EMBAJADOR_DESTACADO
status enum PENDING | ACTIVE | SUSPENDED | REJECTED
displayName text            -- nombre público (no exponer datos del CRM)
email text NULL
phone text                  -- normalizado, UNIQUE para evitar duplicados
payoutMethod text NULL
payoutDetails jsonb NULL    -- solo admin
approvedById uuid NULL → users
approvedAt timestamptz NULL
createdAt / updatedAt
```
Índices: `UNIQUE(phone)`, `UNIQUE(customerId)`, `INDEX(status)`.

### `referral_codes`
```
id uuid PK
profileId uuid → referral_profiles
couponId uuid UNIQUE NULL → coupons       -- reutiliza el motor de descuentos
code text UNIQUE
discountType enum NONE | PERCENT | FIXED
discountValue int
commissionType enum FIXED | PERCENT
commissionValue int
commissionBase enum ELIGIBLE_SUBTOTAL_AFTER_DISCOUNT   -- explícito y estable
status enum ACTIVE | INACTIVE | EXPIRED
validFrom / validUntil timestamptz NULL
usageLimit int NULL
usageCount int DEFAULT 0
perCustomerLimit int DEFAULT 1
minSubtotal int DEFAULT 0
createdById uuid → users
createdAt / updatedAt
```
Restricciones: `referral_code_products(codeId, productId)` y `referral_code_categories(codeId, categoryId)` con PK compuesta. (No usar arrays: rompen integridad y las consultas.)
Índices: `UNIQUE(code)`, `INDEX(profileId, status)`.

### `referral_attributions`
```
id uuid PK
profileId uuid → referral_profiles
codeId uuid → referral_codes
orderId uuid UNIQUE → orders          -- una atribución por pedido
attributionType enum CODE | LINK | ADMIN
attributionDate timestamptz
codeSnapshot jsonb                    -- código, reglas y versiones al momento
conflictFlag boolean DEFAULT false
createdAt
```
`UNIQUE(orderId)` es la garantía dura contra atribución duplicada.

### `referral_commissions`
```
id uuid PK
profileId uuid
attributionId uuid UNIQUE → referral_attributions
orderId uuid
amount int                            -- CLP
baseAmount int
rate numeric(6,4)
kind enum SALE | ADJUSTMENT
status enum PENDING | APPROVED | PAID | REJECTED | CANCELLED | REVIEW
calculationSnapshot jsonb             -- items, costos, descuento, base, regla
approvedAt / approvedById
paidAt / payoutId
rejectionReason text NULL
createdAt / updatedAt
```
`UNIQUE(attributionId)` + `UNIQUE(orderId)` (para SALE) = idempotencia. Los ajustes por devolución parcial/reversión usan `kind=ADJUSTMENT` con importe negativo y `orderId` no único en ese caso (índice parcial).

### `referral_payouts`
```
id uuid PK
profileId uuid
amount int
paymentMethod text
paymentReference text
status enum REGISTERED | CONFIRMED | VOID
paidAt timestamptz
paidById uuid → users
notes text
createdAt
```
Regla: un pago agrupa comisiones `APPROVED`; al registrarse pasan a `PAID` con `payoutId`. Nunca automático.

### Auditoría
**Reutilizar `audit_logs`** en lugar de crear `referral_audit_logs`:
- `userId` (staff) ya existe; agregar `actorType enum STAFF | CUSTOMER | SYSTEM` y `actorCustomerId uuid NULL`.
- `action` = `REFERRAL_PROFILE_APPROVED`, `COMMISSION_APPROVED`, `PAYOUT_REGISTERED`, etc.
- `oldValue/newValue` JSON para el diff.
Crear una tabla paralela duplicaría la lógica de auditoría, justo lo que el prompt pide evitar.

### Cambios mínimos en tablas existentes
- `Coupon.customerPhone` → **nullable** (cupón legado sigue funcionando; código de referido aplica a cualquier comprador).
- `Coupon`: `discountType` (`PERCENT|FIXED`), `discountValue`, `minSubtotal`, `usageLimit`, `usageCount`, `perCustomerLimit`. Conservar `discountPercent` por compatibilidad y migrar datos.
- `Order`: agregar `referralCodeId uuid NULL` (denormalizado para consultas) **y** la relación 1‑1 vía `referral_attributions.orderId`. `Order.couponCode` se mantiene.
- `Customer`: `UNIQUE(phone)` **no** se puede agregar de inmediato (puede haber duplicados). Plan: deduplicar en migración controlada o crear índice único parcial tras limpieza.

### Reglas de integridad financiera
- Comisión **siempre** calculada en backend a partir de `OrderItem.unitPrice/unitCost`, nunca del body.
- `baseAmount` = subtotal elegible (items que cumplen restricciones) − descuento prorrateado; **excluye envío** por defecto (configurable).
- Snapshot inmutable: si mañana cambian las reglas o precios, la comisión histórica no se altera.
- Sin triggers SQL de negocio: la lógica vive en un solo lugar (servicio), como ya hace el resto del backend.

---

## L. Riesgos técnicos y financieros

### L.1 Bloqueantes (P0)

1. **Pedidos web probablemente no se persisten.** `productId` numérico del seed → FK UUID. Verificar con un pedido real antes de construir atribución encima.
2. **Sin identidad de cliente.** No hay login ni verificación. Cualquiera podría reclamar el código de otro si el panel se abre solo con teléfono.
3. **Precio manipulable en items sin variante.** Comisiones y descuentos calculados sobre un total que el cliente puede inventar.
4. **Cupón de referido incompatible** con `customerPhone` obligatorio y mono-uso: un código compartido debe servir a muchos compradores.
5. **Doble fuente de pedidos** (localStorage/WhatsApp vs BD): la venta real puede no existir en el sistema.

### L.2 Altos (P1)

6. **Consumo de cupón fuera de la transacción** → cupón quemado sin pedido.
7. **Sin reembolso parcial ni contracargo** en el modelo: el ciclo de comisión debe contemplarlos como estados manuales.
8. **`Customer.phone` no único**: duplicados y atribución ambigua.
9. **Cupones administrables inexistentes** (`GET /coupons` → `[]`, Marketing falso). Hay que construir la gestión real, no solo Rewards.
10. **`/coupons` POST solo ADMIN** pero Clientes está disponible para SELLER → 403 silencioso.
11. **Transacciones no interactivas** (pgbouncer): no se puede usar `$transaction(async tx => ...)` con múltiples round-trips. La generación de comisión debe caber en el patrón actual (prefetch + array de writes) o resolverse con `createMany({ skipDuplicates })` + unique.
12. **Tests de backend escasos en flujos financieros** (hay specs, pero no cubren concurrencia de pago/cupón).

### L.3 Medios (P2)

13. Código de referido visible en logs/URLs; no usar tokens sensibles.
14. Enumeración de códigos vía endpoint público: respuesta genérica + throttle (ya existe el patrón en cupones).
15. Fraude por autorreferido: comparar teléfono/RUT del comprador con el participante y marcar `REVIEW`, nunca bloquear automáticamente.
16. Devolución total repone stock incluso si el producto no vuelve físicamente (regla actual); impacta clawback.
17. Sin pruebas E2E del checkout; el flujo real es UI + WhatsApp.
18. La sección `/academia` y los T&C requieren revisión legal; no se deben inventar afirmaciones tributarias ni médicas.

---

## M. Arquitectura propuesta de NUTRIFIT REWARDS

### M.1 Principios
- Un solo e-commerce, un solo dashboard, un solo sistema de pedidos y cupones.
- Participante = registro extendido sobre `Customer`, no un usuario staff.
- Atribución **por pedido**, explícita, iniciada por código en el checkout, validada en backend.
- Comisión generada solo con pago confirmado, calculada en servidor, con snapshot.
- Pagos manuales, auditados, nunca automáticos.

### M.2 Flujo de compra
```
Cliente escribe código en el carrito
        │
        ▼
POST /api/rewards/validate-code  { code, phone, items, subtotal }
  - estado/vigencia/límites/restricciones
  - autorreferido → warning, no bloqueo
  - devuelve descuento calculado y un "codeToken" firmado (HMAC) con codeId+exp
        │
        ▼
Checkout envía referralCode (+ token) a /orders/public
        │
        ▼
OrdersService.create
  - revalida TODO server-side (nunca confía en el token ni en el descuento)
  - aplica descuento mediante el motor de cupones extendido
  - crea la orden + referral_attribution en la MISMA transacción
  - Order nace PENDING (sin comisión)
        │
        ▼
Pago confirmado (confirmPayment / status PAID)
  - dentro de la tx: si hay atribución y pedido elegible →
    crea referral_commission PENDING con snapshot (unique por orderId)
  - reintentos y doble clic → P2025/unique → sin duplicado
        │
        ▼
Devolución / cancelación / contracargo
  - CANCELLED antes de pagar → comisión no existe o se anula
  - RETURNED → comisión CANCELLED (o ADJUSTMENT negativo si ya estaba PAID)
  - chargeback → REVIEW + bloqueo de pago
```

### M.3 Atribución (política v1, documentada)
- Un solo código por pedido.
- Prioridad: **código ingresado explícitamente** > enlace/cookie (si se agrega) > sin atribución.
- Sin ventana de cookie en v1 (menos superficie de manipulación). Si se agrega después: 30 días configurable y el código explícito siempre gana.
- El código del comprador se guarda en el pedido; si el comprador usa su propio código o el de un perfil con su mismo teléfono → `conflictFlag=true` y comisión `REVIEW`.
- Sin atribución retroactiva salvo acción ADMIN auditada.
- `UNIQUE(orderId)` impide doble atribución por concurrencia.

### M.4 Comisión
- Base por defecto: **subtotal de items elegibles − descuento prorrateado, sin envío**.
- Tipos: fija (CLP), porcentual, por participante, por código, por campaña (código con vigencia), por producto/categoría (restricción).
- Configuración en `Config` (`rewards.*`) + columnas del código. El admin no toca código.
- Valores iniciales propuestos: **NO se implementan como reglas**; quedan como configuración editable y deben validarse contra margen real. Default de arranque sugerido y explícitamente revisable: cliente $1.000, embajador $1.500, destacado $2.000; descuento comprador 5%. Todo editable y con advertencia si `margen neto < umbral`.
- Advertencia de margen: `OrderItem.profit` ya existe; el panel muestra margen antes/después de comisión y descuento.

### M.5 Seguridad y autorización
- `ParticipantAuthGuard`: resuelve identidad del participante y expone `req.participant`.
- Todos los endpoints de participante filtran por `profileId` del token; nunca por un id del body.
- Endpoints admin con `@Roles(ADMIN)` (comisiones/pagos) y `@Roles(ADMIN, SELLER)` solo lectura si se decide.
- Validación de entrada con DTOs + `class-validator` (hoy se usa `readJsonBody` manual; el módulo nuevo debe usar el patrón existente con validación explícita).
- Rate limit en validación de códigos y registro.
- Sin `SUPABASE_SERVICE_ROLE_KEY` (no existe). El equivalente es `DATABASE_URL`: no exponerla nunca al frontend.

### M.6 Identidad del participante (decisión obligatoria)
No hay auth de cliente. Opciones:

| Opción | Pros | Contras |
|---|---|---|
| **A. OTP por WhatsApp/SMS (recomendada a futuro)** | identidad real, escalable | requiere proveedor (no existe hoy), costo, más alcance |
| **B. Enlace mágico firmado generado por admin** | sin proveedor, implementable ya, seguro si es de un solo uso y caduca | operación manual, mala UX a escala |
| **C. Acceso con teléfono + código de pedido** | sin proveedor | débil, enumerable, no recomendado |
| **D. Solo panel admin (sin portal participante) en v1** | mínimo riesgo | no cumple el objetivo de autoservicio |

Recomendación: **B en v1** (enlace firmado, expiración 72 h, revocable) y **A en v2**. El portal se protege con cookie de sesión de participante separada de la de staff.

### M.7 UX
- Nuevo tab `Rewards` con subsecciones en el mismo dashboard y estilo `sport-*`.
- Portal `/mi-cuenta/rewards`: resumen, código, enlace, WhatsApp, historial sin datos de compradores.
- Academia después del flujo transaccional.
- Sin urgencias falsas, sin testimonios inventados, sin animaciones decorativas.

### M.8 Chile / legal
- T&C en borrador, revisables: participación gratuita, comisión solo por ventas pagadas y no devueltas, plazos de aprobación, medios de pago, uso indebido, protección de datos (Ley 19.628 y normativa vigente), publicidad de suplementos (no prometer resultados, no afirmar propiedades terapéuticas, respetar etiquetado).
- **No** se afirmará tratamiento tributario (boleta/factura, retención) sin validación contable. El registro de pagos queda preparado para agregar documento y folio.
- No se usarán claims médicos ni resultados garantizados.

---

## N. Plan de implementación por fases

**Fase 1 — Auditoría (completada).** Este documento. Sin cambios.

**Fase 2 — Diseño aprobable.** Cerrar decisiones (§ Decisiones requeridas), diagrama ER final, contratos de API, copy de T&C borrador, plan de pruebas. *Gate de autorización.*

**Fase 3 — Base de datos (entorno de prueba).**
- Migración reversible: tablas nuevas, enums, columnas en `Coupon`/`Order`, índices y únicos.
- Backfill: `Customer.phone` normalizado y deduplicado; `Coupon.discountType=PERCENT`.
- Verificar que RLS/event trigger cierre las tablas nuevas.
- No ejecutar en producción.

**Fase 4 — Backend.**
- `RewardsModule`: perfiles, códigos, validación, atribución.
- `CouponService` extendido (sin romper legados).
- Generación idempotente de comisión en pago; anulación/reversión; auditoría.
- CRUD admin, aprobación, pagos, reportes.
- Pruebas unitarias y de integración.

**Fase 5 — Frontend.**
- Checkout: campo de código, feedback, persistencia, envío.
- Tab Rewards (6 subsecciones) y BottomNav.
- Portal participante (según decisión de identidad).
- Academia (puede ir al final).

**Fase 6 — Integración.**
- Corregir el mapeo de items del checkout (ids reales) y la validación de precios; **requisito previo** para atribución.
- Prueba end-to-end en staging con pedido real, pago manual, devolución.

**Fase 7 — QA y seguridad.**
- 24 escenarios, pruebas de acceso cruzado, concurrencia, idempotencia, build/lint/typecheck.

**Fase 8 — Despliegue controlado.**
- Migración con backup, feature flag `NEXT_PUBLIC_REWARDS_ENABLED`, piloto con 3–5 participantes, plan de rollback (desactivar flag + tablas nuevas no destructivas). Sin tocar producción sin autorización.

---

## O. Complejidad y dependencias

| Componente | Complejidad | Depende de |
|---|---|---|
| Migración de esquema + backfill | Media | aprobación, backup |
| Motor de códigos/descuentos | Media-alta | extensión de `Coupon` |
| Atribución transaccional en checkout | Alta | corregir mapeo de items y precios |
| Generación idempotente de comisiones | Alta | `confirmPayment` actual |
| Reversos (cancel/return/chargeback) | Alta | definir reembolso parcial |
| CRUD admin + reportes | Media | patrón de tabs existente |
| Portal participante | Alta | **decisión de identidad** |
| Academia + T&C | Baja-media | revisión legal |

Dependencias externas: ninguna nueva obligatoria para v1 con enlace firmado. Para OTP: proveedor de WhatsApp/SMS. Para pagos a participantes: transferencia manual registrada (no pasarela).

Riesgo de cronograma: la corrección del checkout y la identidad del participante son prerrequisitos, no "extras". Sin ellos el programa sería cosmético.

---

## P. Pruebas necesarias (24 escenarios)

| # | Escenario | Viabilidad hoy |
|---|---|---|
| 1 | Registro de participante | Sí (servicio + API) |
| 2 | Aprobación administrativa | Sí |
| 3 | Código único generado | Sí |
| 4 | Código inválido | Sí |
| 5 | Código vencido | Sí |
| 6 | Código inactivo | Sí |
| 7 | Compra con código válido | Sí, tras corregir items del checkout |
| 8 | Descuento correcto | Sí |
| 9 | Atribución al participante correcto | Sí |
| 10 | Confirmación de pago | Sí |
| 11 | Generación de comisión | Sí |
| 12 | Reintento de "webhook"/confirmación | Sí (simulado sobre `confirmPayment`; no hay webhook real) |
| 13 | Sin comisiones duplicadas | Sí (concurrencia + unique) |
| 14 | Cancelación del pedido | Sí |
| 15 | Reembolso parcial | **No** — no existe; requiere implementarlo |
| 16 | Reembolso total | Sí |
| 17 | Contracargo | **Parcial** — no existe el evento; se prueba el estado `REVIEW` manual |
| 18 | Aprobación de comisión | Sí |
| 19 | Registro de pago | Sí |
| 20 | Acceso del participante a sus datos | Sí, según identidad elegida |
| 21 | Bloqueo de acceso a datos ajenos | Sí |
| 22 | Permisos administrativos | Sí |
| 23 | Integridad del checkout actual | Sí (incluye regresión de cupón legado) |
| 24 | Reportes y totales | Sí (contrastar con `getReports`) |

Se documentarán como no ejecutadas/no aplicables las que dependan de reembolso parcial, contracargo real y webhook de pago, con el motivo.

Infra de tests existente: Jest en frontend (15 suites) y backend (19 specs). Se agregarán specs de `commission-calculator` (puro), `rewards.service`, `referral-codes.service` y un test de integración de `OrdersService.confirmPayment` con atribución.

---

## Decisiones requeridas antes de la Fase 3

1. **Identidad del participante:** ¿enlace mágico en v1 (recomendado) u OTP con proveedor?
2. **Alcance del checkout:** ¿autorizas corregir el mapeo de items/precios del checkout web (P0) como parte de Rewards, o se trata como proyecto separado previo?
3. **Reglas comerciales iniciales:** ¿se confirman los valores propuestos ($1.000 / $1.500 / $2.000; 5% comprador; base sin envío y después de descuento) como configuración inicial editable?

Sin estas tres respuestas, implementar sería construir sobre supuestos.

---

*Fin del informe. No se modificó código, base de datos, checkout ni configuración. Se espera autorización explícita para la Fase 2/3.*
