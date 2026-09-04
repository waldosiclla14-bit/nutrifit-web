import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findInternal(query: any = {}) {
    const where: any = { isActive: true };
    if (query.category) where.categoryId = query.category;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        basePrice: true,
        costPrice: true,
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            variantName: true,
            sku: true,
            price: true,
            costPrice: true,
            stock: true,
            reservedStock: true,
            lowStockAlert: true,
            isActive: true,
          },
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
    if (!Number.isSafeInteger(quantity)) throw new BadRequestException('Cantidad de stock inválida');
    const res: any = await this.prisma.$executeRaw`
      UPDATE "product_variants"
      SET "stock" = "stock" + ${quantity}
      WHERE "id" = ${variantId} AND ("stock" + ${quantity}) >= 0
    `;
    const affected = Number(res?.count ?? res ?? 0);
    if (affected === 0) throw new BadRequestException('Stock insuficiente');
    return this.prisma.productVariant.findUnique({ where: { id: variantId } });
  }

  async updatePrice(id: string, price: number) {
    if (!Number.isSafeInteger(price) || price < 0) throw new BadRequestException('Precio inválido');
    const variant = await this.prisma.productVariant.findUnique({ where: { id } });
    if (variant) {
      return this.prisma.productVariant.update({ where: { id }, data: { price } });
    }
    return this.prisma.product.update({ where: { id }, data: { basePrice: price } });
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Producto no encontrado');

    const productData: any = {};
    if (data.name !== undefined) {
      const name = String(data.name).trim();
      if (!name) throw new BadRequestException('El nombre del producto no puede quedar vacío');
      productData.name = name;
      if (data.name !== existing.name) productData.slug = await this.uniqueSlug(name);
    }
    if (data.description !== undefined) productData.description = data.description ? String(data.description) : null;
    if (data.registroIsp !== undefined) {
      productData.registroIsp = data.registroIsp ? String(data.registroIsp).trim() : null;
    }
    if (data.basePrice !== undefined) productData.basePrice = Math.max(0, Number(data.basePrice) || 0);
    if (data.costPrice !== undefined) productData.costPrice = Math.max(0, Number(data.costPrice) || 0);
    if (data.comparePrice !== undefined) {
      const cp = Number(data.comparePrice);
      productData.comparePrice = !Number.isNaN(cp) && cp > 0 ? Math.round(cp) : null;
    }
    if (data.imageUrl !== undefined) productData.imageUrl = data.imageUrl ? String(data.imageUrl) : null;
    if (data.isActive !== undefined) productData.isActive = !!data.isActive;
    if (data.isFeatured !== undefined) productData.isFeatured = !!data.isFeatured;
    if (data.sku !== undefined) {
      const sku = String(data.sku).trim().toUpperCase() || existing.sku;
      if (sku !== existing.sku) productData.sku = await this.uniqueSku(sku, 'product');
    }
    if (data.categoryId !== undefined || data.category !== undefined) {
      const categoryId = await this.resolveCategory(data.categoryId, data.category ?? existing.categoryId);
      if (categoryId) productData.categoryId = categoryId;
    }
    if (data.brandId !== undefined || data.brand !== undefined) {
      const brandId = await this.resolveBrand(data.brandId, data.brand);
      productData.brandId = brandId ?? null;
    }

    const variants: any[] = Array.isArray(data.variants) ? data.variants : [];

    if (data.costPrice === undefined && data.basePrice !== undefined && existing.costPrice === 0) {
      productData.costPrice = productData.costPrice ?? 0;
    }

    // Sequential writes (Neon pgbouncer transaction-mode compatible):
    // Each variant is updated/created individually. SKU uniqueness uses
    // sequential reads + the ProductVariant.sku @unique constraint as the
    // hard backstop.
    for (const v of variants) {
      const vSku = String(v.sku || '').trim().toUpperCase();
      const vPrice = Number(v.price);
      const vCost = Number(v.costPrice);
      if (v.id) {
        await this.prisma.productVariant.update({
          where: { id: v.id },
          data: {
            variantName: String(v.variantName || '').trim() || undefined,
            sku: vSku ? await this.uniqueSku(vSku, 'variant', v.id) : undefined,
            attributes: v.attributes || undefined,
            price: v.price !== undefined && v.price !== '' ? (Number.isNaN(vPrice) ? null : vPrice) : undefined,
            costPrice: v.costPrice !== undefined && v.costPrice !== '' ? (Number.isNaN(vCost) ? 0 : vCost) : undefined,
            stock: v.stock !== undefined ? Math.max(0, Number(v.stock) || 0) : undefined,
            lowStockAlert: v.lowStockAlert !== undefined ? Math.max(0, Number(v.lowStockAlert) || 5) : undefined,
            isActive: v.isActive !== undefined ? !!v.isActive : undefined,
          },
        });
      } else {
        await this.prisma.productVariant.create({
          data: {
            productId: id,
            sku: await this.uniqueSku(vSku || `${existing.sku}-${this.slugify(v.variantName || 'var')}`, 'variant'),
            variantName: String(v.variantName || '').trim() || 'Única',
            attributes: {},
            price: !Number.isNaN(vPrice) && vPrice > 0 ? vPrice : null,
            costPrice: !Number.isNaN(vCost) && vCost > 0 ? vCost : 0,
            stock: Math.max(0, Number(v.stock) || 0),
            lowStockAlert: Math.max(0, Number(v.lowStockAlert) || 5),
          },
        });
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: productData,
      include: { category: true, brand: true, variants: true },
    });
  }

  async delete(id: string, userId?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    await this.prisma.productVariant.updateMany({
      where: { productId: id },
      data: { isActive: false },
    });
    const updated = await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PRODUCT_DEACTIVATED',
        entity: 'Product',
        entityId: id,
        oldValue: { isActive: true },
        newValue: { isActive: false },
      },
    });

    return updated;
  }

  async adjustStock(variantId: string, newStock: number, reason: string, userId?: string) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variante no encontrada');

    if (!Number.isSafeInteger(newStock) || newStock < 0) {
      throw new BadRequestException('Stock inválido');
    }
    if (newStock < variant.reservedStock) {
      throw new BadRequestException('El nuevo stock no puede ser menor que el stock reservado');
    }
    const stock = newStock;
    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock },
      include: { product: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'STOCK_ADJUSTED',
        entity: 'ProductVariant',
        entityId: variantId,
        oldValue: { stock: variant.stock },
        newValue: { stock, reason },
      },
    });

    return updated;
  }

  async getInventoryValue() {
    const result = await this.prisma.$queryRaw<{ total_cost: bigint; total_retail: bigint; total_items: bigint }[]>`
      SELECT
        COALESCE(SUM(COALESCE(v."costPrice", p."costPrice", 0) * v."stock"), 0) AS total_cost,
        COALESCE(SUM(COALESCE(v."price", p."basePrice") * v."stock"), 0) AS total_retail,
        COALESCE(SUM(v."stock"), 0) AS total_items
      FROM "product_variants" v
      JOIN "products" p ON p."id" = v."productId"
      WHERE p."isActive" = true AND v."isActive" = true
    `;
    const r = result[0];
    const totalCost = Number(r.total_cost);
    const totalRetail = Number(r.total_retail);
    const totalItems = Number(r.total_items);
    return {
      totalCost,
      totalRetail,
      totalItems,
      potentialProfit: totalRetail - totalCost,
      avgMargin: totalRetail > 0 ? Math.round(((totalRetail - totalCost) / totalRetail) * 100) : 0,
    };
  }

  async create(data: any) {
    const name = String(data.name || '').trim();
    if (!name) throw new BadRequestException('El nombre del producto es obligatorio');

    const slug = await this.uniqueSlug(name);
    const sku = await this.uniqueSku(
      String(data.sku || '').trim().toUpperCase() || `SKU-${slug.toUpperCase()}`,
      'product',
    );

    const categoryId = await this.resolveCategory(data.categoryId, data.category);
    if (!categoryId) throw new BadRequestException('Selecciona o escribe una categoría');

    const brandId = await this.resolveBrand(data.brandId, data.brand);

    const variants: any[] = Array.isArray(data.variants) ? data.variants : [];
    const basePrice = Number(data.basePrice);
    const firstVariantPrice = Number(variants[0]?.price);
    const finalBasePrice =
      !Number.isNaN(basePrice) && basePrice > 0 ? basePrice : !Number.isNaN(firstVariantPrice) ? firstVariantPrice : 0;

    const costPrice = Number(data.costPrice);
    const firstVariantCost = Number(variants[0]?.costPrice);
    const finalCostPrice =
      !Number.isNaN(costPrice) && costPrice > 0 ? costPrice : !Number.isNaN(firstVariantCost) ? firstVariantCost : 0;

    const comparePrice = Number(data.comparePrice);
    const finalComparePrice = !Number.isNaN(comparePrice) && comparePrice > 0 ? comparePrice : null;

    // Non-interactive: SKU uniqueness is computed with sequential reads (and the
    // DB @unique constraint on ProductVariant.sku is the hard backstop). A single
    // nested product.create() with variants.create is atomic and pgbouncer-safe.
    const variantCreates: any[] = [];
    for (const v of variants) {
      const vName = String(v.variantName || '').trim() || 'Única';
      const vSku = await this.uniqueSku(
        String(v.sku || '').trim().toUpperCase() || `${sku}-${this.slugify(v.variantName || 'var')}`,
        'variant',
      );
      const vPrice = Number(v.price);
      const vCost = Number(v.costPrice);
      variantCreates.push({
        sku: vSku,
        variantName: vName,
        attributes: {},
        price: !Number.isNaN(vPrice) && vPrice > 0 ? vPrice : null,
        costPrice: !Number.isNaN(vCost) && vCost > 0 ? vCost : 0,
        stock: Math.max(0, Number(v.stock) || 0),
        lowStockAlert: Math.max(0, Number(v.lowStockAlert) || 5),
      });
    }

    return this.prisma.product.create({
      data: {
        name,
        slug,
        sku,
        basePrice: finalBasePrice,
        costPrice: finalCostPrice,
        comparePrice: finalComparePrice,
        description: data.description ? String(data.description) : null,
        registroIsp: data.registroIsp ? String(data.registroIsp).trim() : null,
        categoryId,
        brandId,
        variants: { create: variantCreates },
      },
      include: { category: true, brand: true, variants: true },
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

  private async uniqueSku(sku: string, kind: 'product' | 'variant', excludeId?: string) {
    let base = sku;
    let candidate = sku;
    let n = 2;
    if (kind === 'product') {
      while (await this.prisma.product.findUnique({ where: { sku: candidate } })) {
        candidate = `${base}-${n++}`;
      }
    } else {
      while (true) {
        const existing = await this.prisma.productVariant.findUnique({ where: { sku: candidate } });
        if (!existing || existing.id === excludeId) break;
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
    // Single atomic statement: increment reservedStock only if enough
    // available stock exists. This is a standalone SQL command (no session
    // transaction), so it is compatible with Neon's pgbouncer transaction
    // mode. The DB @unique / column types handle types; count==0 means the
    // availability guard was not satisfied.
    const res: any = await this.prisma.$executeRaw`
      UPDATE "product_variants"
      SET "reservedStock" = "reservedStock" + ${quantity}
      WHERE "id" = ${variantId}
        AND ("stock" - "reservedStock") >= ${quantity}
    `;
    const affected = Number(res?.count ?? res ?? 0);
    if (affected === 0) throw new Error('Stock insuficiente');
    return this.prisma.productVariant.findUnique({ where: { id: variantId } });
  }

  async releaseStock(variantId: string, quantity: number) {
    const res = await this.prisma.productVariant.updateMany({
      where: { id: variantId, reservedStock: { gte: quantity } },
      data: { reservedStock: { decrement: quantity } },
    });
    if (res.count === 0) throw new BadRequestException('Stock reservado insuficiente');
    return this.prisma.productVariant.findUnique({ where: { id: variantId } });
  }

  async confirmStock(variantId: string, quantity: number) {
    const res = await this.prisma.productVariant.updateMany({
      where: { id: variantId, stock: { gte: quantity }, reservedStock: { gte: quantity } },
      data: {
        stock: { decrement: quantity },
        reservedStock: { decrement: quantity },
      },
    });
    if (res.count === 0) throw new BadRequestException('Stock insuficiente');
    return this.prisma.productVariant.findUnique({ where: { id: variantId } });
  }

  // ── Sanitización para consumo público (storefront) ─────────────────────
  // Oculta datos internos: costPrice, stock, reservedStock, lowStockAlert y
  // batches (lotes/FEFO). El panel admin usa GET /products/internal.
  toPublicVariant(v: any) {
    if (!v) return v;
    const { stock, reservedStock, costPrice, lowStockAlert, batches, ...rest } = v;
    if (rest.product) rest.product = this.toPublicProduct(rest.product);
    return rest;
  }

  toPublicProduct(p: any) {
    if (!p) return p;
    const { costPrice, variants, ...rest } = p;
    return {
      ...rest,
      variants: Array.isArray(variants) ? variants.map((v: any) => this.toPublicVariant(v)) : variants,
    };
  }

  toPublicProducts(list: any[]) {
    return (list || []).map((p) => this.toPublicProduct(p));
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
