import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchasesService implements OnModuleInit {
  private readonly logger = new Logger(PurchasesService.name);
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.prisma.$executeRaw`UPDATE "product_variants" SET "reservedStock" = 0 WHERE "reservedStock" > 0`;
      this.logger.log('Reset stale reservedStock to 0');
    } catch {
      this.logger.warn('Could not reset reservedStock on startup');
    }
  }

  async findAll(query: any = {}) {
    const where: any = {};
    if (query.productId) where.productId = query.productId;
    if (query.dateFrom) where.createdAt >= new Date(query.dateFrom);
    if (query.dateTo) where.createdAt <= new Date(query.dateTo);
    if (query.status) where.status = query.status;

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    // Build WHERE clause for raw SQL
    const whereClauses: string[] = ['1=1'];
    if (query.productId) whereClauses.push(`"productId" = ${query.productId}`);
    if (query.dateFrom) whereClauses.push(`"createdAt" >= ${new Date(query.dateFrom)}`);
    if (query.dateTo) whereClauses.push(`"createdAt" <= ${new Date(query.dateTo)}`);
    if (query.status) whereClauses.push(`"status" = ${query.status}`);

    const whereSql = whereClauses.join(' AND ');

    const [data, total] = await Promise.all([
      // Use $queryRaw with text to avoid template literal issues
      this.prisma.$queryRawUnsafe(
        `SELECT 
          "purchase".*,
          "product"."name" as "productName",
          "productVariant"."variantName"
        FROM "purchase"
        LEFT JOIN "product" ON "purchase"."productId" = "product"."id"
        LEFT JOIN "product_variant" ON "purchase"."variantId" = "productVariant"."id"
        WHERE ${whereSql}
        ORDER BY "purchase"."createdAt" DESC
        OFFSET ${skip} LIMIT ${limit}`
      ),
      this.prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "purchase" WHERE ${whereSql}`
      ),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const whereSql = '1=1';
    const sql = `
      SELECT 
        "purchase".*,
        "product"."name" as "productName",
        "productVariant"."variantName"
      FROM "purchase"
      LEFT JOIN "product" ON "purchase"."productId" = "product"."id"
      LEFT JOIN "product_variant" ON "purchase"."variantId" = "productVariant"."id"
      WHERE ${whereSql} AND "purchase"."id" = ${id}
    `;
    const result = await this.prisma.$queryRawUnsafe(sql);
    return (result as any[])[0] || null;
  }

  async create(data: any) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear registro de compra usando raw SQL
      const purchaseId = 'purchase-' + Date.now();
      const totalCost = data.quantity * data.unitCost;

      await tx.$executeRaw`
        INSERT INTO "purchase" ("id", "productId", "variantId", "quantity", "unitCost", "totalCost", "supplier", "referenceNumber", "notes", "status", "createdAt", "updatedAt")
        VALUES (${purchaseId}, ${data.productId}, ${data.variantId}, ${data.quantity}, ${data.unitCost}, ${totalCost}, ${data.supplier || 'NULL'}, ${data.referenceNumber || 'NULL'}, ${data.notes || 'NULL'}, 'pending', now(), now())
      `;

      // 2. Crear movimiento de inventario tipo PURCHASE
      await tx.$executeRaw`
        INSERT INTO "inventory_movement" ("id", "variantId", "type", "quantity", "unitCost", "totalCost", "referenceId", "referenceType", "reason", "createdAt")
        VALUES (gen_random_uuid(), ${data.variantId}, 'PURCHASE', ${data.quantity}, ${data.unitCost}, ${totalCost}, ${purchaseId}, 'purchase', 'Compra de inventario', now())
      `;

      // 3. Aumentar stock físico (physicalStock) en productVariant
      await tx.$executeRaw`
        UPDATE "product_variants"
        SET "stock" = "stock" + ${data.quantity}
        WHERE "id" = ${data.variantId || data.productId} AND ("stock" + ${data.quantity}) >= 0
      `;

      return { success: true, purchaseId };
    });
  }

  async updateStatus(id: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled') {
    const result = await this.prisma.$executeRaw`
      UPDATE "purchase" SET "status" = ${status} WHERE "id" = ${id}
    `;
    const affected = Number(result ?? 0);
    return { affected };
  }

  async delete(id: string) {
    // Anular compra: cambiar estado a cancelled, no restar stock
    const result = await this.prisma.$executeRaw`
      UPDATE "purchase" SET "status" = 'cancelled' WHERE "id" = ${id}
    `;
    const affected = Number(result ?? 0);
    return { affected };
  }

  async getProductOptions(): Promise<Array<{value: string; label: string}>> {
    const variants = (await this.prisma.productVariant.findMany({
      where: { isActive: true },
      select: { id: true, variantName: true, sku: true, product: { select: { name: true } } },
    })) as any[];
    return variants.map((v) => ({
      value: v.id,
      label: (v.product?.name ?? '') + ' - ' + (v.variantName ?? '') + ' (' + (v.sku ?? '') + ')',
    }));
  }
}