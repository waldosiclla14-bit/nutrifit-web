# Rentabilidad logística y liquidación del repartidor

Implementado sobre la arquitectura existente (Next.js 16 + NestJS + Prisma + PostgreSQL/Supabase).
No se creó una app separada ni se reemplazó el dashboard, pedidos, inventario, POS o seguimiento de entregas.

## 1. Diagnóstico previo

- **Entregas existentes**: `deliveries` con estados `DeliveryStatus`, `assignedTo` (repartidor), `deliveryDay`, `deliveredAt`, `failureReason` y auditoría en `delivery_audit_log`.
- **Pedidos**: `orders` ya guarda `subtotal`, `discount`, `shippingCost`, `totalCost` y `profit`; `order_items` guarda `unitCost` histórico por línea.
- **Costos**: el costo real de la venta está en `orders.totalCost` / `order_items.unitCost` (congelado al vender). `products.costPrice` y `product_variants.costPrice` se usan solo como respaldo si el histórico viene en 0.
- **Configuración existente**: `delivery_settings` (ventanas, cupos) y `config` (metas). No existía configuración financiera ni liquidaciones.
- **Finanzas**: `finances` calcula P&L con `orders` + `purchases` + `expenses`; no incluía costo logístico.
- **Seguridad**: RLS global ya bloquea `anon/authenticated`; el backend entra con Prisma (BYPASSRLS).

## 2. Tablas existentes reutilizadas

- `orders`, `order_items`, `deliveries`, `users`, `audit_logs`, `expenses`, `config`, `delivery_settings`.
- No se modificó ninguna columna existente; solo se agregaron relaciones Prisma inversas.

## 3. Estructuras nuevas

Migración: `backend/prisma/migrations/20261119_logistics_profitability/migration.sql`

- `logistics_config`: tarifas versionadas (`courierCost`, `customerFee`, `nutrifitSubsidy`, `effectiveFrom`, `isActive`).
- `delivery_profitability`: snapshot financiero por entrega. **UNIQUE** en `deliveryId` y `orderId`.
- `courier_settlements`: liquidaciones (`PENDIENTE`, `LIQUIDADO`, `ANULADO`).
- `courier_settlement_items`: detalle; **UNIQUE** en `profitabilityId` = barrera final contra doble liquidación.
- Índices por repartidor, día, estado y liquidación.
- FKs a pedido, entrega, usuario, configuración y liquidación.
- RLS habilitado + permisos revocados a `anon/authenticated` (mismo lockdown del proyecto).
- Semilla de tarifas: costo $2.500, cobro cliente $1.000, subsidio $1.500.

## 4. Fórmulas implementadas (siempre en backend)

```
gananciaBruta       = (subtotal - descuento) - costo histórico
subsidio            = costoRepartidor - cobroEntrega
gananciaDespuésLog. = gananciaBruta + cobroEntrega - costoRepartidor
resultadoOperativo  = gananciaDespuésLog. - otrosGastos
```

- El costo del repartidor se descuenta **una sola vez**.
- `margenBruto` de finanzas ya incluye el cobro de entrega: no se vuelve a sumar.
- Los importes del navegador se ignoran; solo se reciben IDs, fechas y método de pago.

## 5. Funcionalidades

### Backend (`/api/logistics`, solo ADMIN)
- `GET/PUT config` + `GET config/history` (versionado).
- `GET summary` (KPIs de hoy/semana/mes, cobrado, subsidio, ganancias, pagado, pendiente, liquidaciones).
- `GET entries` con filtros fecha, repartidor, estado, pedido/cliente.
- `GET failed-deliveries` + `POST entries/exceptional` (cargos excepcionales solo con motivo).
- `GET/POST settlements`, `GET settlements/:id`, `PATCH :id/confirm`, `PATCH :id/cancel`.
- `GET couriers`.

### Integración con entregas
- Hook en `DeliveryService.updateStatus`: al pasar a `DELIVERED` se crea el snapshot financiero (opcional y no bloqueante).
- Una entrega `CANCELLED`, `NOT_DELIVERED`, `CUSTOMER_UNAVAILABLE` o `INCIDENT` no genera obligación automática.
- Los pedidos sin entrega (POS/retiro) no generan costo logístico.

### Frontend
- Nueva pestaña **Rentabilidad logística** en el dashboard (sidebar y menú móvil).
- KPIs, filtros, tabla responsive (tabla en desktop, tarjetas en móvil), selección múltiple.
- Edición de tarifas con subsidio calculado (editable y recalculable).
- Generación/confirmación/anulación de liquidaciones.
- Comprobante PDF vía vista imprimible.
- Cargo excepcional para entregas fallidas.
- Reportes: tarjeta de rentabilidad logística con ganancia antes/después y pagado/pendiente.
- Finanzas: KPIs de ganancia comercial, ganancia después de logística, costo generado, pagado y pendiente.

## 6. Pruebas ejecutadas

- `backend`: **21 suites / 242 tests OK**.
- `frontend`: **18 suites / 156 tests OK**.
- `npx tsc --noEmit` backend y frontend: OK.
- `npm run build`: OK.
- Cobertura específica `logistics.service.spec.ts` (12 tests):
  1. Caso A → $8.500.
  2. Caso B → $7.500.
  3. Sin cobro de entrega → subsidio $2.500.
  4. Descuentos respetados.
  5. Entrega cancelada no genera pago.
  6. Entrega ya liquidada no se recalcula ni duplica.
  7. Intento de liquidar dos veces → rechazado.
  8. Cambio de tarifas crea versión nueva y desactiva la anterior.
  9. Importes inválidos rechazados en backend.
  10. Liquidación parcial incluye solo las entregas seleccionadas.
  11. Liquidación completa suma el total y atribuye el repartidor.
  12. Confirmar dos veces una liquidación pagada → rechazado.

## 7. Despliegue

```bash
# Backend
cd backend
npx prisma migrate deploy
npx prisma generate
npm run build
# Render: redeploy del servicio (DATABASE_URL / DIRECT_URL ya configuradas)

# Frontend
npm run build
# Vercel: redeploy normal, sin variables nuevas
```

Orden recomendado: migración → backend → frontend. La migración es idempotente y no altera tablas existentes.

## 9. Auditoría previa (diagnóstico)

| Área | Hallazgo | Reutilización |
|---|---|---|
| Entregas | `deliveries` con estados `DeliveryStatus`, `assignedTo`, `deliveryDay`, `deliveredAt`, `failureReason` | Snapshot se vincula por `deliveryId` (UNIQUE) |
| Pedidos | `orders.subtotal`, `discount`, `shippingCost`, `totalCost`, `profit`; `order_items.unitCost` histórico | Ganancia bruta = `(subtotal − discount) − totalCost` |
| Costos | `products.costPrice` / `product_variants.costPrice` (respaldo) | Solo si `totalCost = 0` |
| Configuración | `delivery_settings` (ventanas/cupos) y `config` (metas) | No se modificaron; se añadió `logistics_config` |
| Finanzas | `finances` P&L con orders+purchases+expenses | Se añadieron métricas logísticas (costo generado, pagado, pendiente) |
| Seguridad | RLS global bloquea `anon/authenticated`; backend BYPASSRLS | Mismo lockdown en las 4 tablas nuevas |
| Auditoría | `audit_logs` con `userId`, `action`, `entity`, `entityId`, `oldValue`, `newValue` | Se registran cambios de config, cargos y liquidaciones |

## 10. Descripción de pantallas (referencia visual)

1. **Rentabilidad logística — KPIs**: 10 tarjetas (entregas hoy/semana/mes/período, cobrado, subsidio, ganancia comercial, ganancia después de logística, pagado, pendiente, costo generado, liquidaciones pagadas).
2. **Tarifas**: modal con 3 inputs (costo repartidor, cobro cliente, subsidio editable con botón Recalcular) y badge "Versionadas".
3. **Filtros**: botones de rango (Hoy/7 días/30 días/Este mes), fechas desde/hasta, selector de repartidor, estado, búsqueda por pedido/cliente.
4. **Tabla de rentabilidad** (desktop): columnas Pedido, Entrega, Repartidor, Venta prod., Costo prod., Ganancia bruta, Cobro entrega, Pago repart., Ganancia final, Estado; checkboxes para seleccionar.
5. **Vista móvil**: tarjetas con los mismos valores en grid 3 columnas.
6. **Liquidaciones**: listado con número, repartidor, entregas, período, total, estado; botones PDF, Confirmar pago, Anular.
7. **Confirmar pago**: modal con método (efectivo/transferencia/tarjeta/otro) y fecha.
8. **Cargo excepcional**: modal con selector de entrega fallida, monto y motivo.
9. **Analítica & Reportes**: tarjeta "Rentabilidad logística" con 4 valores.
10. **Finanzas/P&L**: KPIs de ganancia comercial, ganancia después de logística, costo logístico generado, pagado/pendiente.

## 11. Validación de casos (paso a paso)

**Caso A — Pack Whey + Creatina**
- Venta neta de productos: $27.500 − $0 = $27.500
- Costo histórico: $17.500
- Ganancia bruta: $10.000
- Cobro al cliente: $1.000
- Pago repartidor: $2.500
- Subsidio NutriFit: $1.500
- Ganancia después de logística: $10.000 + $1.000 − $2.500 = **$8.500**

**Caso B — Óxido Nítrico**
- Venta neta: $15.000
- Costo histórico: $6.000
- Ganancia bruta: $9.000
- Cobro al cliente: $1.000 / Pago repartidor: $2.500
- Ganancia después de logística: $9.000 + $1.000 − $2.500 = **$7.500** (corregido explícitamente desde $8.500).

## 12. Archivos modificados

### Backend
- `prisma/schema.prisma` (modelos/enums/relaciones)
- `prisma/migrations/20261119_logistics_profitability/migration.sql`
- `src/app.module.ts`
- `src/delivery/delivery.module.ts`
- `src/delivery/delivery.service.ts`
- `src/finances/finances.module.ts`
- `src/finances/finances.service.ts`
- `src/finances/finances.service.spec.ts`
- `src/logistics/logistics.controller.ts` (nuevo)
- `src/logistics/logistics.module.ts` (nuevo)
- `src/logistics/logistics.service.ts` (nuevo)
- `src/logistics/logistics.service.spec.ts` (nuevo)

### Frontend
- `src/app/(admin)/admin/page.tsx`
- `src/components/admin/BottomNav.tsx`
- `src/components/admin/Finanzas.tsx`
- `src/components/admin/Reportes.tsx`
- `src/components/admin/RentabilidadLogistica.tsx` (nuevo)
- `src/lib/api.ts`

### Documentación
- `docs/RENTABILIDAD-LOGISTICA.md`
