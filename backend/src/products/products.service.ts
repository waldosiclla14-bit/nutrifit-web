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

  async updatePrice(id: string, price: number) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id } });
    if (variant) {
      return this.prisma.productVariant.update({ where: { id }, data: { price } });
    }
    return this.prisma.product.update({ where: { id }, data: { basePrice: price } });
  }

  async create(data: any) {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('El nombre del producto es obligatorio');

    const slug = await this.uniqueSlug(name);
    const sku = await this.uniqueSku(
      String(data.sku || '').trim().toUpperCase() || `SKU-${slug.toUpperCase()}`,
      'product',
    );

    const categoryId = await this.resolveCategory(data.categoryId, data.category);
    if (!categoryId) throw new Error('Selecciona o escribe una categoría');

    const brandId = await this.resolveBrand(data.brandId, data.brand);

    const variants: any[] = Array.isArray(data.variants) ? data.variants : [];
    const basePrice = Number(data.basePrice);
    const firstVariantPrice = Number(variants[0]?.price);
    const finalBasePrice =
      !Number.isNaN(basePrice) && basePrice > 0 ? basePrice : !Number.isNaN(firstVariantPrice) ? firstVariantPrice : 0;

    const comparePrice = Number(data.comparePrice);
    const finalComparePrice = !Number.isNaN(comparePrice) && comparePrice > 0 ? comparePrice : null;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          slug,
          sku,
          basePrice: finalBasePrice,
          comparePrice: finalComparePrice,
          description: data.description ? String(data.description) : null,
          categoryId,
          brandId,
        },
      });

      for (const v of variants) {
        const vName = String(v.variantName || '').trim() || 'Única';
        const vSku = await this.uniqueSku(
          String(v.sku || '').trim().toUpperCase() || `${sku}-${this.slugify(vName).toUpperCase()}`,
          'variant',
        );
        const vPrice = Number(v.price);
        await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: vSku,
            variantName: vName,
            attributes: {},
            price: !Number.isNaN(vPrice) && vPrice > 0 ? vPrice : null,
            stock: Math.max(0, Number(v.stock) || 0),
            lowStockAlert: Math.max(0, Number(v.lowStockAlert) || 5),
          },
        });
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: { category: true, brand: true, variants: true },
      });
    });
  }

  private slugify(text: string) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async uniqueSlug(name: string) {
    let slug = this.slugify(name);
    if (!slug) slug = 'producto';
    let base = slug;
    let n = 2;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }
    return slug;
  }

  private async uniqueSku(sku: string, kind: 'product' | 'variant') {
    let base = sku;
    let candidate = sku;
    let n = 2;
    if (kind === 'product') {
      while (await this.prisma.product.findUnique({ where: { sku: candidate } })) {
        candidate = `${base}-${n++}`;
      }
    } else {
      while (await this.prisma.productVariant.findUnique({ where: { sku: candidate } })) {
        candidate = `${base}-${n++}`;
      }
    }
    return candidate;
  }

  private async resolveCategory(categoryId: string | undefined, categoryName: string | undefined) {
    if (categoryId) {
      const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (cat) return cat.id;
    }
    const name = String(categoryName || '').trim();
    if (!name) return null;
    const existing = await this.prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) return existing.id;
    let slug = this.slugify(name);
    let base = slug;
    let n = 2;
    while (await this.prisma.category.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }
    const cat = await this.prisma.category.create({ data: { name, slug } });
    return cat.id;
  }

  private async resolveBrand(brandId: string | undefined, brandName: string | undefined) {
    if (brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
      if (brand) return brand.id;
    }
    const name = String(brandName || '').trim();
    if (!name) return null;
    const existing = await this.prisma.brand.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) return existing.id;
    let slug = this.slugify(name);
    let base = slug;
    let n = 2;
    while (await this.prisma.brand.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }
    const brand = await this.prisma.brand.create({ data: { name, slug } });
    return brand.id;
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
