import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockAdjustmentService {
  private readonly logger = new Logger(StockAdjustmentService.name);

  constructor(private prisma: PrismaService) {}

  async applyBulk(adjustments: {
    productId: string;
    variantId?: string;
    quantityDelta: number;
    reason: string;
    notes?: string;
    createdById?: string;
  }[]) {
    if (!adjustments.length) throw new BadRequestException('No hay ajustes para aplicar');

    const valid = adjustments.filter((a) => a.quantityDelta !== 0);
    if (!valid.length) throw new BadRequestException('Todas las cantidades son 0');

    return this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const adj of valid) {
        // Get current stock
        const variant = adj.variantId
          ? await tx.productVariant.findUnique({ where: { id: adj.variantId } })
          : await tx.productVariant.findFirst({ where: { productId: adj.productId } });

        if (!variant) {
          this.logger.warn(`Variant not found for product ${adj.productId}, skipping`);
          continue;
        }

        const previousStock = variant.stock;
        const newStock = Math.max(0, previousStock + adj.quantityDelta);

        // Update variant stock
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newStock },
        });

        // Create adjustment record
        const record = await tx.stockAdjustment.create({
          data: {
            productId: adj.productId,
            variantId: variant.id,
            quantityDelta: adj.quantityDelta,
            reason: adj.reason as any,
            notes: adj.notes || null,
            createdById: adj.createdById || null,
          },
        });

        // Create inventory movement for kardex
        await tx.inventoryMovement.create({
          data: {
            variantId: variant.id,
            type: adj.quantityDelta > 0 ? 'RESTOCK' : 'ADJUSTMENT',
            quantity: Math.abs(adj.quantityDelta),
            previousStock,
            newStock,
            notes: `[${adj.reason}] ${adj.notes || ''}`.trim(),
          },
        });

        results.push({ ...record, previousStock, newStock });
      }

      this.logger.log(`Applied ${results.length} stock adjustments`);
      return results;
    });
  }

  async findAll(query: { productId?: string; reason?: string; from?: string; to?: string }) {
    const where: any = {};
    if (query.productId) where.productId = query.productId;
    if (query.reason) where.reason = query.reason;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    return this.prisma.stockAdjustment.findMany({
      where,
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
