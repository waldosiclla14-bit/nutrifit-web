-- Ficha extendida del producto + cuota diaria del asistente.
-- Aditivo y nullable: no toca datos existentes ni el flujo de ventas/stock.
-- Idempotente para poder re-aplicar sin romper entornos ya migrados.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "size" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "servings" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "ingredients" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "descriptionShort" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "aiSources" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "aiConfidence" JSONB;

CREATE TABLE IF NOT EXISTS "ai_usage_daily" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "calls" INTEGER NOT NULL DEFAULT 0,
  "tokens" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_usage_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_usage_daily_userId_day_key"
  ON "ai_usage_daily"("userId", "day");

CREATE INDEX IF NOT EXISTS "ai_usage_daily_day_idx"
  ON "ai_usage_daily"("day");
