-- Pedidos agendados: estado AGENDADO + fecha programada + fecha de venta real.
-- Un agendado NO cuenta en ventas/caja hasta confirmarse (soldAt = día real).
-- Fully idempotent: safe to run on any database state.

-- Estado AGENDADO en el enum OrderStatus
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'AGENDADO'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'AGENDADO';
  END IF;
END $$;

-- Columnas de fecha en orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "soldAt" TIMESTAMP(3);
