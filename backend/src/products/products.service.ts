import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any = {}) {
    const where: any = { isActive: true };
    if (query.category) where.categoryId = query.category;
    if (query.brand) where.brandId = query.brand;
    if (query.featured) where.isFeatured = true;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        variants: {
          where: { isActive: true },
          include: { batches: { orderBy: { expiryDate: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(idOrSlug: string) {
    return this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        category: true,
        brand: true,
        variants: {
          include: { batches: { orderBy: { expiryDate: 'asc' } } },
        },
      },
    });
  }

  async findBySku(sku: string) {
    return this.prisma.productVariant.findUnique({
      where: { sku },
      include: { product: { include: { category: true, brand: true } } },
    });
  }

  async updateStock(variantId: string, quantity: number) {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: { increment: quantity } },
    });
  }

  async reserveStock(variantId: string, quantity: number) {
    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
      if (!variant || variant.stock - variant.reservedStock < quantity) {
        throw new Error('Stock insuficiente');
      }
      return tx.productVariant.update({
        where: { id: variantId },
        data: { reservedStock: { increment: quantity } },
      });
    });
  }

  async releaseStock(variantId: string, quantity: number) {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { reservedStock: { decrement: quantity } },
    });
  }

  async confirmStock(variantId: string, quantity: number) {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        stock: { decrement: quantity },
        reservedStock: { decrement: quantity },
      },
    });
  }

  async getLowStock() {
    const variants = await this.prisma.productVariant.findMany({
      include: { product: true },
    });
    return variants
      .filter((v) => v.stock <= v.lowStockAlert)
      .sort((a, b) => a.stock - b.stock);
  }
}
