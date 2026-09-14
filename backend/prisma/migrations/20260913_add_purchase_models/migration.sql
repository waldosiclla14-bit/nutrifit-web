-- AlterTable: Add new fields to Supplier
ALTER TABLE "suppliers" ADD COLUMN "rut" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "contactPerson" TEXT,
ADD COLUMN "notes" TEXT;

-- CreateEnum: DocumentType
CREATE TYPE "DocumentType" AS ENUM ('FACTURA', 'BOLETA', 'NOTA_VENTA', 'GUIA_DESPACHO', 'ORDEN_COMPRA', 'OTRO');

-- CreateEnum: PurchaseStatus
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CONFIRMED', 'RECEIVING', 'RECEIVED', 'CANCELLED');

-- CreateEnum: ReceiptStatus
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED');

-- AlterEnum: Add PURCHASE_RECEIPT to MovementType
ALTER TYPE "MovementType" ADD VALUE 'PURCHASE_RECEIPT';

-- CreateTable: Purchase
CREATE TABLE "purchases" (
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
CREATE UNIQUE INDEX "purchases_purchaseNumber_key" ON "purchases"("purchaseNumber");
CREATE UNIQUE INDEX "purchases_idempotencyKey_key" ON "purchases"("idempotencyKey");
CREATE INDEX "purchases_status_idx" ON "purchases"("status");
CREATE INDEX "purchases_supplierId_idx" ON "purchases"("supplierId");
CREATE INDEX "purchases_createdAt_idx" ON "purchases"("createdAt");
CREATE INDEX "purchases_status_createdAt_idx" ON "purchases"("status", "createdAt");

-- AddForeignKey: Purchase -> Supplier
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: PurchaseItem
CREATE TABLE "purchase_items" (
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
CREATE INDEX "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");
CREATE INDEX "purchase_items_productId_idx" ON "purchase_items"("productId");
CREATE INDEX "purchase_items_variantId_idx" ON "purchase_items"("variantId");

-- AddForeignKey: PurchaseItem -> Purchase
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PurchaseItem -> Product
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: PurchaseItem -> ProductVariant
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: PurchaseDocument
CREATE TABLE "purchase_documents" (
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
CREATE INDEX "purchase_documents_purchaseId_idx" ON "purchase_documents"("purchaseId");

-- AddForeignKey: PurchaseDocument -> Purchase
ALTER TABLE "purchase_documents" ADD CONSTRAINT "purchase_documents_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: GoodsReceipt
CREATE TABLE "goods_receipts" (
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
CREATE UNIQUE INDEX "goods_receipts_receiptNumber_key" ON "goods_receipts"("receiptNumber");
CREATE INDEX "goods_receipts_purchaseId_idx" ON "goods_receipts"("purchaseId");
CREATE INDEX "goods_receipts_status_idx" ON "goods_receipts"("status");
CREATE INDEX "goods_receipts_receivedAt_idx" ON "goods_receipts"("receivedAt");

-- AddForeignKey: GoodsReceipt -> Purchase
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: GoodsReceiptItem
CREATE TABLE "goods_receipt_items" (
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
CREATE INDEX "goods_receipt_items_receiptId_idx" ON "goods_receipt_items"("receiptId");
CREATE INDEX "goods_receipt_items_purchaseItemId_idx" ON "goods_receipt_items"("purchaseItemId");

-- AddForeignKey: GoodsReceiptItem -> GoodsReceipt
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: GoodsReceiptItem -> PurchaseItem
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "purchase_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: GoodsReceiptItem -> ProductVariant
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: ProductCostHistory
CREATE TABLE "product_cost_history" (
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
CREATE INDEX "product_cost_history_productId_idx" ON "product_cost_history"("productId");
CREATE INDEX "product_cost_history_variantId_idx" ON "product_cost_history"("variantId");
CREATE INDEX "product_cost_history_purchaseId_idx" ON "product_cost_history"("purchaseId");
CREATE INDEX "product_cost_history_purchaseDate_idx" ON "product_cost_history"("purchaseDate");

-- AddForeignKey: ProductCostHistory -> Product
ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: ProductCostHistory -> ProductVariant
ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: ProductCostHistory -> Purchase
ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: InventoryMovement — add purchaseId, receiptId, unitCost
ALTER TABLE "inventory_movements" ADD COLUMN "purchaseId" TEXT,
ADD COLUMN "receiptId" TEXT,
ADD COLUMN "unitCost" INTEGER;

-- CreateIndex: InventoryMovement
CREATE INDEX "inventory_movements_purchaseId_idx" ON "inventory_movements"("purchaseId");
