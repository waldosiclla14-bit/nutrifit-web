-- Rentabilidad logística y liquidación del repartidor.
-- Tablas 100% nuevas. No se altera ninguna tabla existente de pedidos,
-- inventario, POS ni entregas: solo se agregan FKs hacia ellas.
-- Idempotente: puede ejecutarse sobre una base ya migrada.

DO $$ BEGIN
  CREATE TYPE "ProfitabilityStatus" AS ENUM ('PENDIENTE', 'LIQUIDADO', 'ANULADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SettlementStatus" AS ENUM ('PENDIENTE', 'LIQUIDADO', 'ANULADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CourierChargeType" AS ENUM ('ENTREGA_REALIZADA', 'EXCEPCIONAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Configuración versionada ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "logistics_config" (
    "id" TEXT NOT NULL,
    "courierCost" INTEGER NOT NULL DEFAULT 2500,
    "customerFee" INTEGER NOT NULL DEFAULT 1000,
    "nutrifitSubsidy" INTEGER NOT NULL DEFAULT 1500,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_config_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "logistics_config_isActive_effectiveFrom_idx"
  ON "logistics_config"("isActive", "effectiveFrom");

-- ── Rentabilidad por entrega ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "delivery_profitability" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL DEFAULT '',
    "deliveryDay" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "productRevenue" INTEGER NOT NULL DEFAULT 0,
    "productCost" INTEGER NOT NULL DEFAULT 0,
    "grossProfit" INTEGER NOT NULL DEFAULT 0,
    "customerDeliveryFee" INTEGER NOT NULL DEFAULT 0,
    "courierCost" INTEGER NOT NULL DEFAULT 0,
    "nutrifitSubsidy" INTEGER NOT NULL DEFAULT 0,
    "logisticsResult" INTEGER NOT NULL DEFAULT 0,
    "netProfit" INTEGER NOT NULL DEFAULT 0,
    "otherExpenses" INTEGER NOT NULL DEFAULT 0,
    "operatingResult" INTEGER NOT NULL DEFAULT 0,
    "chargeType" "CourierChargeType" NOT NULL DEFAULT 'ENTREGA_REALIZADA',
    "chargeReason" TEXT,
    "configId" TEXT,
    "configSnapshot" JSONB,
    "settlementStatus" "ProfitabilityStatus" NOT NULL DEFAULT 'PENDIENTE',
    "settlementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_profitability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "delivery_profitability_deliveryId_key"
  ON "delivery_profitability"("deliveryId");
CREATE UNIQUE INDEX IF NOT EXISTS "delivery_profitability_orderId_key"
  ON "delivery_profitability"("orderId");
CREATE INDEX IF NOT EXISTS "delivery_profitability_courierId_settlementStatus_idx"
  ON "delivery_profitability"("courierId", "settlementStatus");
CREATE INDEX IF NOT EXISTS "delivery_profitability_deliveryDay_idx"
  ON "delivery_profitability"("deliveryDay");
CREATE INDEX IF NOT EXISTS "delivery_profitability_settlementId_idx"
  ON "delivery_profitability"("settlementId");
CREATE INDEX IF NOT EXISTS "delivery_profitability_settlementStatus_deliveryDay_idx"
  ON "delivery_profitability"("settlementStatus", "deliveryDay");

-- ── Liquidaciones ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "courier_settlements" (
    "id" TEXT NOT NULL,
    "settlementNumber" TEXT NOT NULL,
    "courierId" TEXT,
    "courierName" TEXT NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDIENTE',
    "periodFrom" TEXT,
    "periodTo" TEXT,
    "deliveriesCount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "paymentDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "cancelledReason" TEXT,
    "createdById" TEXT,
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_settlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "courier_settlements_settlementNumber_key"
  ON "courier_settlements"("settlementNumber");
CREATE INDEX IF NOT EXISTS "courier_settlements_status_idx"
  ON "courier_settlements"("status");
CREATE INDEX IF NOT EXISTS "courier_settlements_courierId_createdAt_idx"
  ON "courier_settlements"("courierId", "createdAt");
CREATE INDEX IF NOT EXISTS "courier_settlements_createdAt_idx"
  ON "courier_settlements"("createdAt");

CREATE TABLE IF NOT EXISTS "courier_settlement_items" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "profitabilityId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "deliveryDay" TEXT,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_settlement_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "courier_settlement_items_profitabilityId_key"
  ON "courier_settlement_items"("profitabilityId");
CREATE INDEX IF NOT EXISTS "courier_settlement_items_settlementId_idx"
  ON "courier_settlement_items"("settlementId");
CREATE INDEX IF NOT EXISTS "courier_settlement_items_orderId_idx"
  ON "courier_settlement_items"("orderId");

-- ── Claves foráneas ─────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "delivery_profitability" ADD CONSTRAINT "delivery_profitability_deliveryId_fkey"
    FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "delivery_profitability" ADD CONSTRAINT "delivery_profitability_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "delivery_profitability" ADD CONSTRAINT "delivery_profitability_courierId_fkey"
    FOREIGN KEY ("courierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "delivery_profitability" ADD CONSTRAINT "delivery_profitability_configId_fkey"
    FOREIGN KEY ("configId") REFERENCES "logistics_config"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "courier_settlements" ADD CONSTRAINT "courier_settlements_courierId_fkey"
    FOREIGN KEY ("courierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Se agrega después de crear courier_settlements para evitar dependencia circular.
DO $$ BEGIN
  ALTER TABLE "delivery_profitability" ADD CONSTRAINT "delivery_profitability_settlementId_fkey"
    FOREIGN KEY ("settlementId") REFERENCES "courier_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "courier_settlement_items" ADD CONSTRAINT "courier_settlement_items_settlementId_fkey"
    FOREIGN KEY ("settlementId") REFERENCES "courier_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "courier_settlement_items" ADD CONSTRAINT "courier_settlement_items_profitabilityId_fkey"
    FOREIGN KEY ("profitabilityId") REFERENCES "delivery_profitability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Seguridad: mismo lockdown que el resto de public (backend BYPASSRLS) ────
ALTER TABLE "logistics_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery_profitability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courier_settlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courier_settlement_items" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  REVOKE ALL ON TABLE "logistics_config" FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE ALL ON TABLE "delivery_profitability" FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE ALL ON TABLE "courier_settlements" FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE ALL ON TABLE "courier_settlement_items" FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Semilla de la configuración vigente (2500 / 1000 / 1500).
INSERT INTO "logistics_config" ("id", "courierCost", "customerFee", "nutrifitSubsidy", "isActive")
SELECT '00000000-0000-4000-8000-000000000001', 2500, 1000, 1500, true
WHERE NOT EXISTS (SELECT 1 FROM "logistics_config");
