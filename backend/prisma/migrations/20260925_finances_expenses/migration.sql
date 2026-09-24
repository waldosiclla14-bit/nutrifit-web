-- Finanzas P&L: gastos operacionales (tablas 100% nuevas, nada existente se toca).
-- Ingresos/COGS se leen de orders/purchases ya existentes.
-- Fully idempotent: safe to run on any database state.

CREATE TABLE IF NOT EXISTS "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_name_key" ON "expense_categories"("name");

CREATE TABLE IF NOT EXISTS "expenses" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "spentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "expenses_spentAt_idx" ON "expenses"("spentAt");
CREATE INDEX IF NOT EXISTS "expenses_categoryId_idx" ON "expenses"("categoryId");

DO $$ BEGIN
  ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
