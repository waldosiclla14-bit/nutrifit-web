-- Ensure everything the POS checkout path needs exists.
-- The production database was baselined via `db push` before these objects
-- existed and no migration ever created them:
--   - order_counters table (atomic order numbers, Sept 2)
--   - orders.idempotencyKey (Sept 3)
--   - enum labels added over time (DeliveryType, PaymentMethod, OrderStatus,
--     PaymentStatus, MovementType extras)
-- Fully idempotent: safe to run on any database state.

-- ── order_counters table ──
CREATE TABLE IF NOT EXISTS "order_counters" (
    "id" INTEGER NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_counters_pkey" PRIMARY KEY ("id")
);

-- ── orders.idempotencyKey ──
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotencyKey_key" ON "orders"("idempotencyKey");

-- ── enum values (one guarded block per label) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MovementType') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'MovementType' AND e.enumlabel = 'PURCHASE_RECEIPT'
  ) THEN
    ALTER TYPE "MovementType" ADD VALUE 'PURCHASE_RECEIPT';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MovementType') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'MovementType' AND e.enumlabel = 'RESERVATION'
  ) THEN
    ALTER TYPE "MovementType" ADD VALUE 'RESERVATION';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MovementType') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'MovementType' AND e.enumlabel = 'RELEASE'
  ) THEN
    ALTER TYPE "MovementType" ADD VALUE 'RELEASE';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryType') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'DeliveryType' AND e.enumlabel = 'METRO'
  ) THEN
    ALTER TYPE "DeliveryType" ADD VALUE 'METRO';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryType') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'DeliveryType' AND e.enumlabel = 'RETIRO_TIENDA'
  ) THEN
    ALTER TYPE "DeliveryType" ADD VALUE 'RETIRO_TIENDA';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryType') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'DeliveryType' AND e.enumlabel = 'ENVIO_DOMICILIO'
  ) THEN
    ALTER TYPE "DeliveryType" ADD VALUE 'ENVIO_DOMICILIO';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentMethod' AND e.enumlabel = 'TRANSFERENCIA'
  ) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'TRANSFERENCIA';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentMethod' AND e.enumlabel = 'EFECTIVO'
  ) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'EFECTIVO';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentMethod' AND e.enumlabel = 'FLOW_MANUAL'
  ) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'FLOW_MANUAL';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentMethod' AND e.enumlabel = 'MERCADOPAGO_MANUAL'
  ) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'MERCADOPAGO_MANUAL';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentMethod' AND e.enumlabel = 'TARJETA_MANUAL'
  ) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'TARJETA_MANUAL';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentMethod' AND e.enumlabel = 'MIXTO'
  ) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'MIXTO';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'PENDING'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'PENDING';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'CONFIRMED'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'CONFIRMED';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'PAID'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'PAID';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'PREPARING'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'PREPARING';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'READY'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'READY';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'DELIVERED'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERED';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'CANCELLED'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLED';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'RETURNED'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentStatus' AND e.enumlabel = 'PENDING'
  ) THEN
    ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentStatus' AND e.enumlabel = 'CONFIRMED'
  ) THEN
    ALTER TYPE "PaymentStatus" ADD VALUE 'CONFIRMED';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentStatus' AND e.enumlabel = 'REJECTED'
  ) THEN
    ALTER TYPE "PaymentStatus" ADD VALUE 'REJECTED';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentStatus' AND e.enumlabel = 'REFUNDED'
  ) THEN
    ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';
  END IF;
END $$;
