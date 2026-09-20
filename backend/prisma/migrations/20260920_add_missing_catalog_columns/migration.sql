-- Idempotent: backfills catalog columns/enum values added after the production
-- database was baselined via `db push` (spec v1: barcode, reservation types).
-- Safe to re-run: every statement skips existing objects.

-- products.barcode (spec v1, never migrated)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "products_barcode_key" ON "products"("barcode");

-- product_variants.barcode (spec v1, never migrated)
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_barcode_key" ON "product_variants"("barcode");

-- MovementType values missing in db-pushed databases.
-- RESERVATION / RELEASE came with spec v1 (no migration);
-- PURCHASE_RECEIPT is ensured here too in case 20260913 never ran.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'MovementType' AND e.enumlabel = 'RESERVATION'
  ) THEN
    ALTER TYPE "MovementType" ADD VALUE 'RESERVATION';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'MovementType' AND e.enumlabel = 'RELEASE'
  ) THEN
    ALTER TYPE "MovementType" ADD VALUE 'RELEASE';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'MovementType' AND e.enumlabel = 'PURCHASE_RECEIPT'
  ) THEN
    ALTER TYPE "MovementType" ADD VALUE 'PURCHASE_RECEIPT';
  END IF;
END $$;
