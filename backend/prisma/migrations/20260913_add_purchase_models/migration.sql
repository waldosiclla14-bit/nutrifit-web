-- Idempotent version: this migration may run on databases created via `db push`
-- where some (or all) of these objects already exist. Every statement below
-- is safe to re-run: existing objects are skipped, missing ones are created.

-- AlterTable: Add new fields to Supplier
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "rut" TEXT,
ADD COLUMN IF NOT EXISTS "email" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "contactPerson" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- CreateEnum: DocumentType
DO $$ BEGIN
  CREATE TYPE "DocumentType" AS ENUM ('FACTURA', 'BOLETA', 'NOTA_VENTA', 'GUIA_DESPACHO', 'ORDEN_COMPRA', 'OTRO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: PurchaseStatus
DO $$ BEGIN
  CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CONFIRMED', 'RECEIVING', 'RECEIVED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: ReceiptStatus
DO $$ BEGIN
  CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum: Add PURCHASE_RECEIPT to MovementType
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'MovementType' AND e.enumlabel = 'PURCHASE_RECEIPT'
  ) THEN
    ALTER TYPE "MovementType" ADD VALUE 'PURCHASE_RECEIPT';
  END IF;
END $$;

-- CreateTable: Purchase
CREATE TABLE IF NOT EXISTS "purchases" (
    "id" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "supplierId" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "documentType" "DocumentType",
    "documentNumber" TEXT,
    "documentDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "ocrRawData" JSONB,
    "ocrConfidence" DOUBLE PRECISION,
    "humanCorrections" JSONB,
    "receiptStatus" "ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "receivedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Purchase
CREATE UNIQUE INDEX IF NOT EXISTS "purchases_purchaseNumber_key" ON "purchases"("purchaseNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "purchases_idempotencyKey_key" ON "purchases"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "purchases_status_idx" ON "purchases"("status");
CREATE INDEX IF NOT EXISTS "purchases_supplierId_idx" ON "purchases"("supplierId");
CREATE INDEX IF NOT EXISTS "purchases_createdAt_idx" ON "purchases"("createdAt");
CREATE INDEX IF NOT EXISTS "purchases_status_createdAt_idx" ON "purchases"("status", "createdAt");

-- AddForeignKey: Purchase -> Supplier
DO $$ BEGIN
  ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: PurchaseItem
CREATE TABLE IF NOT EXISTS "purchase_items" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantName" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "totalCost" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "ocrRawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PurchaseItem
CREATE INDEX IF NOT EXISTS "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");
CREATE INDEX IF NOT EXISTS "purchase_items_productId_idx" ON "purchase_items"("productId");
CREATE INDEX IF NOT EXISTS "purchase_items_variantId_idx" ON "purchase_items"("variantId");

-- AddForeignKey: PurchaseItem -> Purchase
DO $$ BEGIN
  ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: PurchaseItem -> Product
DO $$ BEGIN
  ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: PurchaseItem -> ProductVariant
DO $$ BEGIN
  ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: PurchaseDocument
CREATE TABLE IF NOT EXISTS "purchase_documents" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "ocrProcessed" BOOLEAN NOT NULL DEFAULT false,
    "ocrRawData" JSONB,
    "ocrConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PurchaseDocument
CREATE INDEX IF NOT EXISTS "purchase_documents_purchaseId_idx" ON "purchase_documents"("purchaseId");

-- AddForeignKey: PurchaseDocument -> Purchase
DO $$ BEGIN
  ALTER TABLE "purchase_documents" ADD CONSTRAINT "purchase_documents_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: GoodsReceipt
CREATE TABLE IF NOT EXISTS "goods_receipts" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: GoodsReceipt
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipts_receiptNumber_key" ON "goods_receipts"("receiptNumber");
CREATE INDEX IF NOT EXISTS "goods_receipts_purchaseId_idx" ON "goods_receipts"("purchaseId");
CREATE INDEX IF NOT EXISTS "goods_receipts_status_idx" ON "goods_receipts"("status");
CREATE INDEX IF NOT EXISTS "goods_receipts_receivedAt_idx" ON "goods_receipts"("receivedAt");

-- AddForeignKey: GoodsReceipt -> Purchase
DO $$ BEGIN
  ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: GoodsReceiptItem
CREATE TABLE IF NOT EXISTS "goods_receipt_items" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "purchaseItemId" TEXT NOT NULL,
    "variantId" TEXT,
    "expectedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL,
    "damagedQty" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: GoodsReceiptItem
CREATE INDEX IF NOT EXISTS "goods_receipt_items_receiptId_idx" ON "goods_receipt_items"("receiptId");
CREATE INDEX IF NOT EXISTS "goods_receipt_items_purchaseItemId_idx" ON "goods_receipt_items"("purchaseItemId");

-- AddForeignKey: GoodsReceiptItem -> GoodsReceipt
DO $$ BEGIN
  ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: GoodsReceiptItem -> PurchaseItem
DO $$ BEGIN
  ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "purchase_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: GoodsReceiptItem -> ProductVariant
DO $$ BEGIN
  ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: ProductCostHistory
CREATE TABLE IF NOT EXISTS "product_cost_history" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "purchaseId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL,
    "totalCost" INTEGER NOT NULL,
    "previousCost" INTEGER,
    "newAverageCost" INTEGER,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_cost_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ProductCostHistory
CREATE INDEX IF NOT EXISTS "product_cost_history_productId_idx" ON "product_cost_history"("productId");
CREATE INDEX IF NOT EXISTS "product_cost_history_variantId_idx" ON "product_cost_history"("variantId");
CREATE INDEX IF NOT EXISTS "product_cost_history_purchaseId_idx" ON "product_cost_history"("purchaseId");
CREATE INDEX IF NOT EXISTS "product_cost_history_purchaseDate_idx" ON "product_cost_history"("purchaseDate");

-- AddForeignKey: ProductCostHistory -> Product
DO $$ BEGIN
  ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: ProductCostHistory -> ProductVariant
DO $$ BEGIN
  ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey: ProductCostHistory -> Purchase
DO $$ BEGIN
  ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: InventoryMovement — add purchaseId, receiptId, unitCost
ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "purchaseId" TEXT,
ADD COLUMN IF NOT EXISTS "receiptId" TEXT,
ADD COLUMN IF NOT EXISTS "unitCost" INTEGER;

-- CreateIndex: InventoryMovement
CREATE INDEX IF NOT EXISTS "inventory_movements_purchaseId_idx" ON "inventory_movements"("purchaseId");
