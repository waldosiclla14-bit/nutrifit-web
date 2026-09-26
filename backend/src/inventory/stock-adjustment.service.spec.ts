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
        { productId: 'p1', quantityDelta: 0, reason: 'CONTEO_FISICO' },
      ])).rejects.toThrow(BadRequestException);
    });

    it('applies positive delta (restock)', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({ id: 'v1', physicalStock: 5 });
      prisma.productVariant.update.mockResolvedValue({});
      prisma.stockAdjustment.create.mockResolvedValue({ id: 'sa1' });
      prisma.inventoryMovement.create.mockResolvedValue({});
      prisma.$transaction.mockImplementation(async (writes: any[]) => [{}, { id: 'sa1' }, {}]);

      const result = await service.applyBulk([
        { productId: 'p1', variantId: 'v1', quantityDelta: 10, reason: 'INGRESO_COMPRA', notes: 'Received shipment' },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].previousStock).toBe(5);
      expect(result[0].newStock).toBe(15);
      // Transacción NO interactiva (array) → compatible pgbouncer
      expect(prisma.$transaction.mock.calls[0][0]).toBeInstanceOf(Array);
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'RESTOCK', quantity: 10 }),
        }),
      );
    });

    it('applies negative delta (adjustment)', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({ id: 'v1', physicalStock: 10 });
      prisma.$transaction.mockImplementation(async (writes: any[]) => [{}, { id: 'sa2' }, {}]);

      const result = await service.applyBulk([
        { productId: 'p1', variantId: 'v1', quantityDelta: -3, reason: 'MERMA', notes: 'Broken items' },
      ]);

      expect(result[0].newStock).toBe(7);
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'ADJUSTMENT', quantity: 3 }),
        }),
      );
    });

    it('clamps stock to 0 (never negative)', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({ id: 'v1', physicalStock: 2 });
      prisma.$transaction.mockImplementation(async (writes: any[]) => [{}, { id: 'sa3' }, {}]);

      const result = await service.applyBulk([
        { productId: 'p1', variantId: 'v1', quantityDelta: -10, reason: 'MERMA' },
      ]);

      expect(result[0].newStock).toBe(0);
    });

    it('skips non-existent variants', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (writes: any[]) => []);

      const result = await service.applyBulk([
        { productId: 'p1', variantId: 'nonexistent', quantityDelta: 5, reason: 'INGRESO_COMPRA' },
      ]);

      expect(result).toHaveLength(0);
    });

    it('uses first variant if no variantId provided', async () => {
      prisma.productVariant.findFirst.mockResolvedValue({ id: 'v1', physicalStock: 0 });
      prisma.$transaction.mockImplementation(async (writes: any[]) => [{}, { id: 'sa4' }, {}]);

      const result = await service.applyBulk([
        { productId: 'p1', quantityDelta: 10, reason: 'INGRESO_COMPRA' },
      ]);

      expect(result).toHaveLength(1);
      expect(prisma.productVariant.findFirst).toHaveBeenCalledWith({
        where: { productId: 'p1' },
        orderBy: { id: 'asc' },
      });
    });

    it('rejects invalid reason and delta', async () => {
      await expect(
        service.applyBulk([{ productId: 'p1', quantityDelta: 5, reason: 'INVENTADO' }]),
      ).rejects.toThrow('motivo inválido');
      await expect(
        service.applyBulk([{ productId: 'p1', quantityDelta: -9999999999, reason: 'MERMA' }]),
      ).rejects.toThrow('quantityDelta inválido');
      await expect(
        service.applyBulk([{ productId: '', quantityDelta: 5, reason: 'MERMA' }]),
      ).rejects.toThrow('productId requerido');
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

    it('rejects invalid reason', async () => {
      await expect(service.findAll({ reason: 'INVENTADO' })).rejects.toThrow('Motivo inválido');
    });
  });
});
