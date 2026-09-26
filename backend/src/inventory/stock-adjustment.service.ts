import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaPromise } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { rangeBound } from '../common/date-range';

const VALID_REASONS = ['INGRESO_COMPRA', 'CONTEO_FISICO', 'MERMA', 'DEVOLUCION'];

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

    const validReasons = VALID_REASONS;
    for (const [idx, adj] of adjustments.entries()) {
      if (typeof adj.productId !== 'string' || !adj.productId) {
        throw new BadRequestException(`Ajuste ${idx + 1}: productId requerido`);
      }
      if (!Number.isSafeInteger(adj.quantityDelta) || adj.quantityDelta === 0 || Math.abs(adj.quantityDelta) > 1000000) {
        throw new BadRequestException(`Ajuste ${idx + 1}: quantityDelta inválido`);
      }
      if (!validReasons.includes(adj.reason)) {
        throw new BadRequestException(`Ajuste ${idx + 1}: motivo inválido`);
      }
    }

    const valid = adjustments.filter((a) => a.quantityDelta !== 0);
    if (!valid.length) throw new BadRequestException('Todas las cantidades son 0');

    // Pre-lectura + writes array (NO interactiva): pgbouncer transaction-mode
    // P2028 en $transaction(async) → 500 al ajustar stock.
    const resolved: { adj: (typeof valid)[number]; variant: { id: string; physicalStock: number } }[] = [];
    for (const adj of valid) {
      const variant = adj.variantId
        ? await this.prisma.productVariant.findUnique({ where: { id: adj.variantId } })
        : await this.prisma.productVariant.findFirst({ where: { productId: adj.productId }, orderBy: { id: 'asc' } });
      if (!variant) {
        this.logger.warn(`Variant not found for product ${adj.productId}, skipping`);
        continue;
      }
      resolved.push({ adj, variant });
    }

    const writes: PrismaPromise<any>[] = [];
    for (const { adj, variant } of resolved) {
      const previousStock = variant.physicalStock;
      const newStock = Math.max(0, previousStock + adj.quantityDelta);

      writes.push(
        this.prisma.productVariant.update({
          where: { id: variant.id },
          data: { physicalStock: newStock },
        }),
      );
      writes.push(
        this.prisma.stockAdjustment.create({
          data: {
            productId: adj.productId,
            variantId: variant.id,
            quantityDelta: adj.quantityDelta,
            reason: adj.reason as any,
            notes: adj.notes || null,
            createdById: adj.createdById || null,
          },
        }),
      );
      writes.push(
        this.prisma.inventoryMovement.create({
          data: {
            variantId: variant.id,
            type: adj.quantityDelta > 0 ? 'RESTOCK' : 'ADJUSTMENT',
            quantity: Math.abs(adj.quantityDelta),
            previousStock,
            newStock,
            notes: `[${adj.reason}] ${adj.notes || ''}`.trim(),
          },
        }),
      );
    }

    const results = await this.prisma.$transaction(writes);
    this.logger.log(`Applied ${resolved.length} stock adjustments`);
    return resolved.map(({ adj, variant }, i) => ({
      ...(results[i * 3 + 1] as object),
      previousStock: variant.physicalStock,
      newStock: Math.max(0, variant.physicalStock + adj.quantityDelta),
    }));
  }

  async findAll(query: { productId?: string; reason?: string; from?: string; to?: string }) {
    const where: any = {};
    if (query.productId) where.productId = query.productId;
    if (query.reason) {
      if (!VALID_REASONS.includes(query.reason)) {
        throw new BadRequestException(`Motivo inválido: ${query.reason}`);
      }
      where.reason = query.reason;
    }
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = rangeBound(query.from, false);
      if (query.to) where.createdAt.lte = rangeBound(query.to, true);
    }

    return this.prisma.stockAdjustment.findMany({
      where,
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
