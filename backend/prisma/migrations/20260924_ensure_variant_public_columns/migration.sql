-- product_variants public-visibility columns (Sept 12, never migrated).
-- Any full-variant SELECT (POS checkout variant map, product create/edit
-- return payloads, inventory movements, barcode lookup) fails without them,
-- while explicit-field SELECTs (POS grid) keep working — hence the confusing
-- partial outage. Fully idempotent.
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "publicStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "publicPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

CREATE INDEX IF NOT EXISTS "product_variants_isActive_publicPublished_idx" ON "product_variants"("isActive", "publicPublished");
