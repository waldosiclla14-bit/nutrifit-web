-- Fase 4: proof of delivery and courier cash rendering.
-- Only NEW tables. No POS, order, stock or existing delivery columns are
-- altered. Idempotent: safe to run on a database that already has them.

DO $$ BEGIN
  CREATE TYPE "CashShiftStatus" AS ENUM ('ABIERTA', 'RENDIDA', 'CONFIRMADA', 'ANULADA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- One collection per delivery: unique key blocks double charging.
CREATE TABLE IF NOT EXISTS "delivery_collections" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_collections_pkey" PRIMARY KEY ("id")
);

-- Coded and/or photographed proof of delivery. The image is a compressed
-- JPEG data URL in the same database (no new storage provider).
CREATE TABLE IF NOT EXISTS "delivery_proofs" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "code" TEXT,
    "recipientName" TEXT,
    "photoDataUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_proofs_pkey" PRIMARY KEY ("id")
);

-- Courier cash shift for one Chile calendar day. Separate from POS registers.
CREATE TABLE IF NOT EXISTS "courier_cash_shifts" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "status" "CashShiftStatus" NOT NULL DEFAULT 'ABIERTA',
    "expectedEfectivo" INTEGER NOT NULL DEFAULT 0,
    "expectedTransferencia" INTEGER NOT NULL DEFAULT 0,
    "expectedOtro" INTEGER NOT NULL DEFAULT 0,
    "declaredEfectivo" INTEGER,
    "declaredTransferencia" INTEGER,
    "declaredOtro" INTEGER,
    "difference" INTEGER,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_cash_shifts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "delivery_collections_deliveryId_key"
    ON "delivery_collections"("deliveryId");
CREATE INDEX IF NOT EXISTS "delivery_collections_courierId_collectedAt_idx"
    ON "delivery_collections"("courierId", "collectedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "delivery_proofs_deliveryId_key"
    ON "delivery_proofs"("deliveryId");
CREATE INDEX IF NOT EXISTS "delivery_proofs_courierId_createdAt_idx"
    ON "delivery_proofs"("courierId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "courier_cash_shifts_courierId_day_key"
    ON "courier_cash_shifts"("courierId", "day");
CREATE INDEX IF NOT EXISTS "courier_cash_shifts_day_status_idx"
    ON "courier_cash_shifts"("day", "status");

DO $$ BEGIN
  ALTER TABLE "delivery_collections" ADD CONSTRAINT "delivery_collections_deliveryId_fkey"
    FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "delivery_collections" ADD CONSTRAINT "delivery_collections_courierId_fkey"
    FOREIGN KEY ("courierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_deliveryId_fkey"
    FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_courierId_fkey"
    FOREIGN KEY ("courierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "courier_cash_shifts" ADD CONSTRAINT "courier_cash_shifts_courierId_fkey"
    FOREIGN KEY ("courierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "courier_cash_shifts" ADD CONSTRAINT "courier_cash_shifts_confirmedById_fkey"
    FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
