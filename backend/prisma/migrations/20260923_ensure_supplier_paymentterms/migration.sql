-- suppliers.paymentTerms was added to the schema (Sept 5, Fases 1-3) without
-- any migration, so db-pushed databases lack the enum type and/or the column.
-- POST /suppliers without paymentTerms works; with paymentTerms it fails.
-- Covers every possible state:
--   - type missing + column missing -> creates both
--   - type present + column missing -> adds column
--   - type present + column present, labels missing -> adds labels
--   - everything present -> all statements no-op
--   - column present as TEXT (no enum type) -> type creation runs, column
--     skipped, label blocks skipped by the type-existence guard

DO $$ BEGIN
  CREATE TYPE "PaymentTerm" AS ENUM ('CREDITO', 'CONTADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "paymentTerms" "PaymentTerm" NOT NULL DEFAULT 'CONTADO';

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentTerm')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'PaymentTerm' AND e.enumlabel = 'CREDITO'
     ) THEN
    ALTER TYPE "PaymentTerm" ADD VALUE 'CREDITO';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentTerm')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'PaymentTerm' AND e.enumlabel = 'CONTADO'
     ) THEN
    ALTER TYPE "PaymentTerm" ADD VALUE 'CONTADO';
  END IF;
END $$;
