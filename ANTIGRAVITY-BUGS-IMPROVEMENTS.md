# NutriFit — Auditoria Completa: Bugs + Mejoras Admin/POS

> Proyecto: NutriFit Chile
> Stack: Next.js 16 + NestJS + Prisma + PostgreSQL (Render) + Vercel
> Repo: `waldosiclla14-bit/nutrifit-web` rama `main`

---

## SECCION 1: BUGS CRITICOS (deben arreglarse primero)

### 1.1 Stock se pierde al reiniciar servidor
**Archivo:** `backend/src/products/products.service.ts` ~linea 14
**Problema:** `onModuleInit` resetea TODOS los `reservedStock` a 0 al iniciar el servidor. Si hay ordenes con reservas pendientes, el stock reservado se pierde y se puede vender de mas.
**Fix:** No resetear reservedStock. En su lugar, reconciliar reservas verificando ordenes con status `CONFIRMED` o `PENDING` al iniciar.

### 1.2 Delivery code usa Math.random() (predecible)
**Archivo:** `backend/src/delivery.service.ts` ~linea 120
**Problema:** `Math.floor(1000 + Math.random() * 9000)` es predecible. Un atacante puede predecir el codigo de verificacion.
**Fix:** Usar `crypto.randomInt(1000, 9999)` (ya se usa en orders.service.ts linea 496).

### 1.3 Race condition en numeros secuenciales de compras
**Archivo:** `backend/src/purchases.service.ts` lineas 496-511
**Problema:** `generatePurchaseNumber` y `generateReceiptNumber` usan read-then-write sin atomicidad. Dos requests concurrentes pueden generar el mismo numero.
**Fix:** Crear un counter table (igual que `OrderCounter` para ordenes) o usar `$queryRaw` con atomic increment.

### 1.4 Transacciones no atomicas en pgbouncer
**Archivo:** `backend/src/orders.service.ts` lineas 57-87
**Problema:** `expireAbandonedOrders()` usa `this.prisma.$transaction(writes)` con array de operaciones mixtas. En Neon pgbouncer transaction-mode, cada statement auto-commits. Si el UPDATE de la orden falla pero el release de stock falla, los datos quedan inconsistentes.
**Fix:** Usar una sola raw SQL statement o reestructurar para que cada operacion sea independiente y tolerante a fallos.

### 1.5 Doble descuento de stock en delivery
**Archivo:** `backend/src/delivery.service.ts` lineas 320-375
**Problema:** `autoCompleteOrder` decrementa `physicalStock` y `reservedStock` al cambiar a DELIVERED. Pero la orden puede haber sido marcada PAID por `confirmPayment` (que tambien decrementa stock). Resultado: stock se decrementa doble.
**Fix:** Verificar si el stock ya fue descontado antes de decrementar. Agregar flag `stockDeducted` o verificar el status anterior de la orden.

---

## SECCION 2: BUGS ALTOS

### 2.1 Purchases no tiene control de roles
**Archivo:** `backend/src/purchases.controller.ts` linea 9
**Problema:** No hay `@Roles()` decorator. Cualquier usuario autenticado (incluido DELIVERY) puede crear, actualizar y eliminar compras.
**Fix:** Agregar `@Roles(Role.ADMIN)` al controller o a cada endpoint individual.

### 2.2 Error 500 al guardar barcode duplicado
**Archivo:** `backend/src/products/products.service.ts` lineas 237-271, 414-432
**Problema:** Si se ingresa un barcode que ya existe, Prisma lanza P2002 sin mensaje amigable.
**Fix:** YA CORREGIDO — envolver en try/catch y convertir P2002 a BadRequestException.

### 2.3 Documentos base64 en la base de datos
**Archivo:** `backend/src/purchases/purchases.service.ts` linea 287
**Problema:** `storagePath` almacena base64 crudo (megabytes de texto). Esto hincha la DB, causa queries lentas y puede exceder limites TOAST de PostgreSQL.
**Fix:** Migrar a S3/R2 para almacenamiento de archivos. Guardar solo la URL/path en la DB.

### 2.4 POS no valida stock al checkout
**Archivo:** `src/components/admin/Pos.tsx` lineas 607-620
**Problema:** La funcion `insufficientStock()` esta definida pero NUNCA se ejecuta en `checkout()`. Se puede vender mas de lo que hay en stock.
**Fix:** Llamar `insufficientStock()` antes de procesar el pago y bloquear si hay stock insuficiente.

### 2.5 Productos no cargan en admin (stock en 0)
**Archivo:** `src/lib/admin/helpers.ts` linea 50
**Problema:** El backend devuelve `physicalStock` pero el frontend leia `v.stock` (undefined → 0). Todos los productos mostraban stock = 0.
**Fix:** YA CORREGIDO — mapear `physicalStock` a `stock` en `mapApiProduct`.

### 2.6 Barcodes no se cargan en admin
**Archivo:** `backend/src/products/products.service.ts` lineas 71-96
**Problema:** `findInternal` no seleccionaba `barcode` ni en productos ni en variantes. El admin nunca veia los barcodes.
**Fix:** YA CORREGIDO — agregar `barcode: true` al select.

### 2.7feldto Stock en reservas se decrementa dos veces
**Archivo:** `backend/src/orders.service.ts` lineas 682-784
**Problema:** `confirmPayment` decrementa `reservedStock` e `updateStatus` tambien lo hace en transiciones a PAID. Si ambos corren concurrentemente, el stock se decrementa doble.
**Fix:** Usar `SELECT ... FOR UPDATE` en la transaccion o agregar campo `reservedStockDeducted` en la orden.

---

## SECCION 3: BUGS MEDIOS

### 3.1 Brand search muestra `[object Object]`
**Archivo:** `src/components/admin/Productos.tsx` linea 182
**Problema:** El filtro de busqueda concatenar `p.brand` directamente. Como `brand` es un objeto, muestra `[object Object]`.
**Fix:** Usar `p.brandName || (typeof p.brand === 'object' ? p.brand.name : '') || ''`.

### 3.2 Edit form brand muestra `[object Object]`
**Archivo:** `src/components/admin/Productos.tsx` linea 315
**Problema:** `String(p.brand || '')` en `openEdit` produce `[object Object]`.
**Fix:** Mismo que 3.1.

### 3.3 WhatsApp phone duplica codigo pais
**Archivo:** `src/components/admin/Clientes.tsx` linea 180
**Problema:** `window.open('https://wa.me/56${phone}...')` agrega `56` sin verificar si el telefono ya lo incluye. Si el cliente tiene `56912345678`, se forma `5656912345678`.
**Fix:** Verificar si el telefono empieza con `56` antes de agregar el prefijo.

### 3.4 Filtros de linea y comuna se sobreescriben
**Archivo:** `backend/src/delivery.service.ts` lineas 37-42
**Problema:** Si se envian ambos `query.line` y `query.commune`, el segundo sobreescribe el primero. Solo uno aplica.
**Fix:** Merge: `where.station = { line: query.line, commune: query.commune }`.

### 3.5 CostHistory ignora el parametro :id
**Archivo:** `backend/src/purchases/purchases.controller.ts` linea 64
**Problema:** `GET :id/cost-history` recibe `id` pero el handler llama `getCostHistory(undefined, undefined)`, devolviendo TODO el historial.
**Fix:** Pasar el `id` al service y filtrar por purchase.

### 3.6 metro controller usa @Query para mutaciones
**Archivo:** `backend/src/metro/metro.controller.ts` linea 35
**Problema:** `update(@Param('id') id: string, @Query() data: any)` lee datos de actualizacion de query params en vez de request body.
**Fix:** Cambiar a `@Body() data: any`.

### 3.7 Inventario no muestra totales
**Archivo:** `src/components/admin/Inventario.tsx` linea 63
**Problema:** `summary.totalProducts` esta hardcodeado a `0`, nunca se obtiene de la API.
**Fix:** Agregar endpoint `GET /admin/inventory/summary` que devuelva conteos reales.

### 3.8 Fecha y hora invalidas en POS
**Archivo:** `src/components/admin/Pos.tsx` linea 455
**Problema:** `computeEndTime` con input `"23:30"` retorna `"24:00"` que no es ISO valido.
**Fix:** Validar que el resultado no exceda `"23:59"` o ajustar el calculo.

### 3.9 Compras usa JSON.stringify doble
**Archivo:** `src/components/admin/Compras.tsx` linea 293
**Problema:** `body: JSON.stringify({...})` pero `apiFetch` ya hace stringify. Se envia un string en vez de JSON.
**Fix:** Pasar el objeto directamente: `body: { ... }`.

### 3.10 Compras usa confirm() nativo
**Archivo:** `src/components/admin/Compras.tsx` lineas 324, 337
**Problema:** Usa `confirm()` nativo del browser en vez del `useConfirm()` del proyecto. Inconsistente con el resto.
**Fix:** Reemplazar con `useConfirm()`.

### 3.11 Compras pierde precision en costos
**Archivo:** `src/components/admin/Compras.tsx` linea 625
**Problema:** `unitCost` usa `parseInt()` — un costo de `$1.500,50` se convierte en `$1500`.
**Fix:** Usar `parseFloat()` o `Number()` en vez de `parseInt()`.

---

## SECCION 4: BUGS BAJOS

### 4.1 Timer leak en auth controller
**Archivo:** `backend/src/auth/auth.controller.ts` linea 53
**Problema:** `setInterval` para cleanup de intentos nunca se limpia. En hot-reload o tests, se acumulan timers.
**Fix:** Usar `OnModuleDestroy` lifecycle hook.

### 4.2 Audit logs no tienen userId
**Archivo:** `backend/src/delivery.service.ts` linea 597
**Problema:** El metodo `audit` acepta `userId` pero todos los callers nunca lo pasan. Los logs siempre tienen `userId: null`.
**Fix:** Pasar el userId del request en todos los llamadas a `audit`.

### 4.3 Menu lateral no se cierra en mobile
**Archivo:** `src/components/admin/BottomNav.tsx`
**Problema:** Al navegar a una seccion, el sidebar no se cierra automaticamente en mobile.
**Fix:** Agregar `setSidebarOpen(false)` al hacer click en un item del nav.

### 4.4 Compras no tiene paginacion
**Archivo:** `src/components/admin/Compras.tsx`
**Problema:** Carga todas las compras de una vez. Con muchas compras, se vuelve lento.
**Fix:** Agregar paginacion o infinite scroll.

### 4.5 Clientes no tiene paginacion
**Archivo:** `src/components/admin/Clientes.tsx`
**Problema:** Igual que compras — carga todos los clientes de una vez.
**Fix:** Agregar paginacion.

### 4.6 Import masivo no tiene progress bar
**Archivo:** `src/components/admin/Productos.tsx` lineas 461-578
**Problema:** Al importar un Excel grande, no hay indicador de progreso. Solo se muestra "Importando..." sin saber cuanto falta.
**Fix:** Mostrar contador de filas procesadas/total.

### 4.7 Stock se puede poner negativo en create
**Archivo:** `src/components/admin/Productos.tsx` linea 292
**Problema:** `Number(v.stock) || 0` — si el usuario escribe `-1`, se guarda como `-1`.
**Fix:** `Math.max(0, Number(v.stock) || 0)`.

---

## SECCION 5: MEJORAS ADMIN

### 5.1 Excel Import/Export incompleto
**Estado:** YA CORREGIDO — columnas barcode agregadas.
**Pendiente:** Agregar columnas `supplier` (proveedor) y `registro_isp` al export/import.

### 5.2 Productos — Validaciones faltantes
- [ ] Validar `basePrice > 0` al crear producto
- [ ] Validar SKU unico al crear (el backend lo acepta sin validar)
- [ ] No permitir variants sin nombre Y sin SKU Y sin barcode
- [ ] Confirmacion antes de guardar (evitar clicks accidentales)
- [ ] Loading skeleton mientras carga

### 5.3 Productos — UX mejoras
- [ ] Toggle compacto/detallado con iconos Lucide (no emojis)
- [ ] Margin display actualizado en tiempo real al editar precio/costo inline
- [ ] Filtro por categoria, marca, proveedor
- [ ] Busqueda por barcode en el filtro principal
- [ ] Paginacion o infinite scroll

### 5.4 POS — Bugs criticos
- [ ] `insufficientStock()` nunca se ejecuta — stock se puede exceder
- [ ] Default stock `999` para productos sin tracking —应该 ser `Infinity` o mejor logica
- [ ] `printReceipt` imprime toda la pagina, no solo el ticket
- [ ] Sin feedback cuando se agrega un producto con stock 0

### 5.5 POS — Mejoras UX
- [ ] Floating cart button overlapping bottom nav en mobile
- [ ] Touch-action: manipulation en botones +/- para evitar double-tap zoom en iOS
- [ ] Cart panel sin max-h — en mobile se pierde
- [ ] Mostrar badge de holds en el boton (no solo en el dropdown)
- [ ] Delivery time end editable en modo DELIVERY

### 5.6 POS — Validaciones faltantes
- [ ] Phone format validation (no letras aunque inputMode=tel)
- [ ] `computeEndTime` no maneja `"23:30"` → `"24:00"` invalido
- [ ] MIXTO: validar `mixedCash >= 0 && mixedTransfer >= 0`
- [ ] Cart vacio despues de setQty a 0 — race condition

### 5.7 Ordenes — Mejoras
- [ ] No se usa status `SHIPPED` — se salta de PAID a DELIVERED
- [ ] No hay acciones bulk (seleccionar multiples para cambiar status)
- [ ] Sin filtro de rango de fechas
- [ ] Sin export/print de la lista
- [ ] Mobile cards no muestran direccion para ENVIO_DOMICILIO

### 5.8 Entregas — Mejoras
- [ ] Sin filtro historico (solo muestra hoy por defecto)
- [ ] `handleAuthError` con callback vacio — no redirige al login
- [ ] Sin validacion de transicion de status
- [ ] Sin notas de entrega
- [ ] Sin actualizacion en tiempo real
- [ ] CSV export sin nombre con rango de fechas

### 5.9 Inventario — Features faltantes
- [ ] Sin ajuste manual de stock
- [ ] Sin filtro por producto, rango de fechas, variante
- [ ] Sin busqueda por SKU o nombre
- [ ] Sin export
- [ ] Sin tipos de movimiento RECEIPT, TRANSFER, DAMAGE, EXPIRED

### 5.10 Clientes — Bugs y mejoras
- [ ] Phone: window.open duplica codigo pais (ver 3.3)
- [ ] Sin validacion de formato de telefono
- [ ] Sin validacion de formato de email
- [ ] Hard delete — should ser soft delete
- [ ] Sin historial de ordenes del cliente
- [ ] Sin campo de notas/tags
- [ ] Sin import/export
- [ ] Sin paginacion

### 5.11 Resumen — Mejoras
- [ ] Si stats falla, todo el dashboard desaparece sin error
- [ ] Sin auto-refresh toggle
- [ ] Sin date picker personalizado
- [ ] Sin ability to download dashboard data

---

## SECCION 6: MEJORAS BACKEND

### 6.1 Seguridad
- [ ] `Math.random()` → `crypto.randomInt()` en delivery codes
- [ ] Atomic counter para purchase/receipt numbers
- [ ] `@Roles(Role.ADMIN)` en PurchasesController
- [ ] CAPTCHA en `createPublicOrder` (endpoint publico)
- [ ] Migrar documentos base64 de DB a S3/R2
- [ ] `reservedStock` no se resetea al iniciar servidor

### 6.2 Transacciones
- [ ] Usar `SELECT ... FOR UPDATE` en stock reservation
- [ ] Verificar rows affected en stock UPDATE antes de continuar
- [ ] Wrpear `autoCompleteOrder` en transaction con rollback
- [ ] Revisar transacciones en pgbouncer mode

### 6.3 Validacion
- [ ] Crear DTOs para Product create/update (actualmente usa `any`)
- [ ] Validar `subtotal`/`total` no son enviados por el cliente (recomputar server-side)
- [ ] Validar transiciones de status de orden
- [ ] Validar transiciones de status de delivery
- [ ] Filtrar `publicStock` en sanitizer publico

### 6.4 Performance
- [ ] Agregar `@@index([entity, entityId])` en AuditLog
- [ ] Agregar `@@index([productSlug, createdAt])` en Review
- [ ] No acceder a `this.productsService['prisma']` desde controller (usar metodo publico)
- [ ] Migrar `setInterval` cleanup a `OnModuleDestroy`

### 6.5 Schema Prisma
- [ ] Considerar renombrar columna `stock` → `physicalStock` en DB (alinear con Prisma)
- [ ] Agregar campos faltantes a tipos TypeScript (ver seccion 7)

---

## SECCION 7: TIPOS INCOMPLETOS (`types/admin.ts`)

### AdminOrder — campos faltantes:
- `shippingAddress: string`
- `discountCode: string`
- `couponId: string`
- `itemCount: number`

### AdminProduct — campos faltantes:
- `imageUrl: string`
- `images: any[]`
- `tags: string[]`
- `slug: string`
- `supplier: AdminSupplier`

### AdminCustomer — campos faltantes:
- `address: string`
- `city: string`
- `notes: string`
- `tags: string[]`

### AdminSupplier — campos faltantes:
- `rut: string`
- `address: string`
- `website: string`

### AdminCashRegister — campos faltantes:
- `transactionCount: number`
- `cashIn: number`
- `cashOut: number`

### AdminReminder — campos faltantes:
- `repeatInterval: string`
- `channel: string`

---

## SECCION 8: ARCHIVOS A REVISAR

| Archivo | Lineas | Prioridad |
|---------|--------|-----------|
| `backend/src/products/products.service.ts` | 629 | Alta |
| `backend/src/orders.service.ts` | 1258 | Alta |
| `backend/src/purchases/purchases.service.ts` | 834 | Alta |
| `backend/src/delivery.service.ts` | 600 | Alta |
| `backend/src/purchases/purchases.controller.ts` | 121 | Alta |
| `src/components/admin/Pos.tsx` | 1741 | Alta |
| `src/components/admin/Productos.tsx` | 1019 | Media |
| `src/components/admin/Compras.tsx` | 1061 | Media |
| `src/components/admin/Ordenes.tsx` | 314 | Media |
| `src/components/admin/Entregas.tsx` | 480 | Media |
| `src/components/admin/Inventario.tsx` | 213 | Baja |
| `src/components/admin/Clientes.tsx` | 338 | Baja |
| `src/components/admin/Resumen.tsx` | 598 | Baja |
| `src/lib/admin/helpers.ts` | 72 | Alta |
| `src/types/admin.ts` | 202 | Media |

---

## SECCION 9: ORDEN DE CORRECCION RECOMENDADO

### Fase 1 — Seguridad y datos (hoy)
1. `Math.random()` → `crypto.randomInt()` en delivery codes
2. Atomic counter para purchase/receipt numbers
3. `@Roles` en PurchasesController
4. No resetear reservedStock al iniciar
5. Doble descuento de stock en delivery

### Fase 2 — Bugs criticos (esta semana)
6. POS: ejecutar `insufficientStock()` en checkout
7. Compras: JSON.stringify doble
8. Compras: parseInt → parseFloat en costos
9. Productos: brand search [object Object]
10. CostHistory: filtrar por id

### Fase 3 — Validaciones (siguiente semana)
11. DTOs para Product create/update
12. Validar transiciones de status
13. Validar barcode duplicado con mensaje claro
14. Phone/email format validation en clientes

### Fase 4 — UX y features (continuo)
15. Paginacion en Compras y Clientes
16. Progress bar en import masivo
17. Loading skeletons
18. Filtros mejorados en Inventario
19. Export/import completo con todos los campos

### Fase 5 — Performance y refactor
20. Migrar documentos base64 a S3/R2
21. Agregar indexes faltantes
22. Revisar transacciones pgbouncer
23. Crear tipos TypeScript completos

---

*Documento generado automaticamente. Ultima actualizacion: Sep 2026*
