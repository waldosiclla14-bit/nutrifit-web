import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StockAdjustmentService } from './stock-adjustment.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StockAdjustmentService', () => {
  let service: StockAdjustmentService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      productVariant: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      stockAdjustment: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      inventoryMovement: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockAdjustmentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<StockAdjustmentService>(StockAdjustmentService);
  });

  describe('applyBulk', () => {
    it('rejects empty adjustments', async () => {
      await expect(service.applyBulk([])).rejects.toThrow(BadRequestException);
    });

    it('rejects all-zero adjustments', async () => {
      await expect(service.applyBulk([
        { productId: 'p1', quantityDelta: 0, reason: 'CORRECTION' },
      ])).rejects.toThrow(BadRequestException);
    });

    it('applies positive delta (restock)', async () => {
      const mockTx = {
        productVariant: {
          findUnique: jest.fn().mockResolvedValue({ id: 'v1', stock: 5 }),
          update: jest.fn().mockResolvedValue({ id: 'v1', stock: 15 }),
        },
        stockAdjustment: {
          create: jest.fn().mockResolvedValue({ id: 'sa1' }),
        },
        inventoryMovement: {
          create: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.applyBulk([
        { productId: 'p1', variantId: 'v1', quantityDelta: 10, reason: 'RESTOCK', notes: 'Received shipment' },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].previousStock).toBe(5);
      expect(result[0].newStock).toBe(15);
      expect(mockTx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'RESTOCK', quantity: 10 }),
        }),
      );
    });

    it('applies negative delta (adjustment)', async () => {
      const mockTx = {
        productVariant: {
          findUnique: jest.fn().mockResolvedValue({ id: 'v1', stock: 10 }),
          update: jest.fn().mockResolvedValue({ id: 'v1', stock: 7 }),
        },
        stockAdjustment: {
          create: jest.fn().mockResolvedValue({ id: 'sa2' }),
        },
        inventoryMovement: {
          create: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.applyBulk([
        { productId: 'p1', variantId: 'v1', quantityDelta: -3, reason: 'DAMAGED', notes: 'Broken items' },
      ]);

      expect(result[0].newStock).toBe(7);
      expect(mockTx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'ADJUSTMENT', quantity: 3 }),
        }),
      );
    });

    it('clamps stock to 0 (never negative)', async () => {
      const mockTx = {
        productVariant: {
          findUnique: jest.fn().mockResolvedValue({ id: 'v1', stock: 2 }),
          update: jest.fn().mockResolvedValue({ id: 'v1', stock: 0 }),
        },
        stockAdjustment: {
          create: jest.fn().mockResolvedValue({ id: 'sa3' }),
        },
        inventoryMovement: {
          create: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.applyBulk([
        { productId: 'p1', variantId: 'v1', quantityDelta: -10, reason: 'DAMAGED' },
      ]);

      expect(result[0].newStock).toBe(0);
    });

    it('skips non-existent variants', async () => {
      const mockTx = {
        productVariant: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        stockAdjustment: { create: jest.fn() },
        inventoryMovement: { create: jest.fn() },
      };
      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.applyBulk([
        { productId: 'p1', variantId: 'nonexistent', quantityDelta: 5, reason: 'RESTOCK' },
      ]);

      expect(result).toHaveLength(0);
    });

    it('uses first variant if no variantId provided', async () => {
      const mockTx = {
        productVariant: {
          findFirst: jest.fn().mockResolvedValue({ id: 'v1', stock: 0 }),
          update: jest.fn().mockResolvedValue({ id: 'v1', stock: 10 }),
        },
        stockAdjustment: {
          create: jest.fn().mockResolvedValue({ id: 'sa4' }),
        },
        inventoryMovement: { create: jest.fn() },
      };
      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.applyBulk([
        { productId: 'p1', quantityDelta: 10, reason: 'RESTOCK' },
      ]);

      expect(result).toHaveLength(1);
      expect(mockTx.productVariant.findFirst).toHaveBeenCalledWith({
        where: { productId: 'p1' },
      });
    });
  });

  describe('findAll', () => {
    it('returns adjustments with variant info', async () => {
      prisma.stockAdjustment.findMany.mockResolvedValue([
        { id: 'sa1', variant: { variantName: '2kg', product: { name: 'Whey' } } },
      ]);

      const result = await service.findAll({});
      expect(result).toHaveLength(1);
    });

    it('filters by productId', async () => {
      prisma.stockAdjustment.findMany.mockResolvedValue([]);
      await service.findAll({ productId: 'p1' });
      expect(prisma.stockAdjustment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ productId: 'p1' }),
        }),
      );
    });
  });
});
