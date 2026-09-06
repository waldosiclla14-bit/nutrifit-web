import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      productVariant: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      brand: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
      auditLog: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('returns products with supplier relation', async () => {
      const mockProducts = [
        { id: 'p1', name: 'Whey Protein', supplier: { id: 's1', name: 'Proveedor A' }, variants: [] },
      ];
      prisma.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.findAll();

      expect(result).toEqual(mockProducts);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            supplier: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('create', () => {
    it('creates product with supplierId and lowStockThreshold', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.category.findFirst.mockResolvedValue({ id: 'cat1' });
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.brand.findFirst.mockResolvedValue(null);
      prisma.brand.findUnique.mockResolvedValue(null);
      prisma.brand.create.mockResolvedValue({ id: 'brand1' });
      prisma.product.create.mockResolvedValue({
        id: 'p1', name: 'Test', slug: 'test', sku: 'SKU-TEST',
        supplierId: 's1', lowStockThreshold: 10,
        category: { id: 'cat1', name: 'Protein' },
        brand: null, supplier: { id: 's1', name: 'Proveedor' }, variants: [],
      });

      const result = await service.create({
        name: 'Test Product',
        category: 'Protein',
        brand: 'Brand',
        supplierId: 's1',
        lowStockThreshold: 10,
        variants: [],
      });

      expect(result.supplierId).toBe('s1');
      expect(result.lowStockThreshold).toBe(10);
    });

    it('creates product without supplier', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.category.findFirst.mockResolvedValue({ id: 'cat1' });
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.brand.findFirst.mockResolvedValue(null);
      prisma.brand.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({
        id: 'p2', name: 'Test 2', slug: 'test-2', sku: 'SKU-2',
        supplierId: null, lowStockThreshold: null,
        category: { id: 'cat1', name: 'Protein' },
        brand: null, supplier: null, variants: [],
      });

      const result = await service.create({
        name: 'Test Product 2',
        category: 'Protein',
        variants: [],
      });

      expect(result.supplierId).toBeNull();
    });

    it('rejects empty name', async () => {
      await expect(service.create({ name: '', category: 'X', variants: [] }))
        .rejects.toThrow(BadRequestException);
    });

    it('rejects missing category', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.category.findFirst.mockResolvedValue(null);
      await expect(service.create({ name: 'Test', category: '', variants: [] }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates supplierId to null', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', name: 'Test', slug: 'test', sku: 'SKU', categoryId: 'cat1' });
      prisma.category.findFirst.mockResolvedValue({ id: 'cat1' });
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.brand.findFirst.mockResolvedValue(null);
      prisma.brand.findUnique.mockResolvedValue(null);
      prisma.product.update.mockResolvedValue({ id: 'p1', supplierId: null });

      const result = await service.update('p1', { supplierId: null });
      expect(result).toBeDefined();
    });

    it('updates lowStockThreshold', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', name: 'Test', slug: 'test', sku: 'SKU', categoryId: 'cat1' });
      prisma.category.findFirst.mockResolvedValue({ id: 'cat1' });
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.brand.findFirst.mockResolvedValue(null);
      prisma.brand.findUnique.mockResolvedValue(null);
      prisma.product.update.mockResolvedValue({ id: 'p1', lowStockThreshold: 15 });

      const result = await service.update('p1', { lowStockThreshold: 15 });
      expect(result).toBeDefined();
    });

    it('rejects updating non-existent product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'Test' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getLowStock', () => {
    it('returns low stock items with productName', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { variantId: 'v1', variantName: '2kg', sku: 'W-2K', stock: 2, threshold: 5, productId: 'p1', productName: 'Whey Protein' },
      ]);

      const result = await service.getLowStock();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('productName');
    });
  });

  describe('getLowStockBySupplier', () => {
    it('groups products by supplier', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { variantId: 'v1', variantName: '2kg', sku: 'W-2K', stock: 2, threshold: 5, productId: 'p1', productName: 'Whey', supplierId: 's1', supplierName: 'Proveedor A', supplierPaymentTerms: 'CREDITO' },
        { variantId: 'v2', variantName: '1kg', sku: 'W-1K', stock: 1, threshold: 5, productId: 'p2', productName: 'Creatina', supplierId: 's1', supplierName: 'Proveedor A', supplierPaymentTerms: 'CREDITO' },
        { variantId: 'v3', variantName: 'Unica', sku: 'BC-1', stock: 0, threshold: 5, productId: 'p3', productName: 'BCAA', supplierId: null, supplierName: null, supplierPaymentTerms: null },
      ]);

      const result = await service.getLowStockBySupplier();
      expect(result).toHaveLength(2);
      expect(result[0].supplierId).toBe('s1');
      expect(result[0].products).toHaveLength(2);
      expect(result[1].supplierId).toBeNull();
      expect(result[1].products).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('soft-deletes product and variants', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', name: 'Test' });
      prisma.productVariant.updateMany.mockResolvedValue({ count: 2 });
      prisma.product.update.mockResolvedValue({ id: 'p1', isActive: false });

      const result = await service.delete('p1', 'user1');
      expect(result.isActive).toBe(false);
      expect(prisma.productVariant.updateMany).toHaveBeenCalled();
    });

    it('rejects deleting non-existent product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
