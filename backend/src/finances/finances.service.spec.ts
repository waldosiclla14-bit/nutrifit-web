import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FinancesService } from './finances.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FinancesService', () => {
  let service: FinancesService;
  let prisma: {
    expenseCategory: { count: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; upsert: jest.Mock };
    expense: { findMany: jest.Mock; create: jest.Mock; findUnique: jest.Mock; delete: jest.Mock; aggregate: jest.Mock; groupBy: jest.Mock };
    order: { aggregate: jest.Mock };
    purchase: { aggregate: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      expenseCategory: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), upsert: jest.fn() },
      expense: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
      order: { aggregate: jest.fn() },
      purchase: { aggregate: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FinancesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<FinancesService>(FinancesService);
  });

  describe('createExpense', () => {
    it('rejects invalid amount and description', async () => {
      await expect(service.createExpense({ description: 'x', amount: 1000 })).rejects.toThrow(BadRequestException);
      await expect(service.createExpense({ description: 'Arriendo local', amount: 0 })).rejects.toThrow(BadRequestException);
      await expect(service.createExpense({ description: 'Arriendo local', amount: -500 })).rejects.toThrow(BadRequestException);
      await expect(service.createExpense({ description: 'Arriendo local', amount: 1000, spentAt: 'no-fecha' })).rejects.toThrow(BadRequestException);
    });

    it('rejects unknown category', async () => {
      prisma.expenseCategory.findUnique.mockResolvedValue(null);
      await expect(
        service.createExpense({ description: 'Arriendo local', amount: 250000, categoryId: 'nope' }),
      ).rejects.toThrow('Categoría inválida');
    });

    it('creates with valid data', async () => {
      prisma.expenseCategory.findUnique.mockResolvedValue({ id: 'c1', name: 'Arriendo', isActive: true });
      prisma.expense.create.mockResolvedValue({ id: 'e1' });

      const res: any = await service.createExpense(
        { description: 'Arriendo local', amount: 250000, categoryId: 'c1', spentAt: '2026-09-01' },
        'u1',
      );

      expect(res).toEqual({ id: 'e1' });
      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'Arriendo local', amount: 250000, categoryId: 'c1' }),
        }),
      );
    });
  });

  describe('createCategory', () => {
    it('rejects short names and duplicates', async () => {
      prisma.expenseCategory.count.mockResolvedValue(3);
      await expect(service.createCategory({ name: 'x' })).rejects.toThrow(BadRequestException);

      prisma.expenseCategory.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
      await expect(service.createCategory({ name: 'Arriendo' })).rejects.toThrow('Ya existe esa categoría');
    });
  });

  describe('summary (P&L)', () => {
    it('utilidadNeta = margenBruto - gastosOp', async () => {
      prisma.order.aggregate.mockResolvedValue({ _sum: { total: 1000000, profit: 400000, totalCost: 600000 }, _count: 20 });
      prisma.purchase.aggregate.mockResolvedValue({ _sum: { total: 300000 }, _count: 2 });
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 150000 }, _count: 5 });
      prisma.expense.groupBy.mockResolvedValue([
        { categoryId: 'c1', _sum: { amount: 100000 }, _count: 3 },
        { categoryId: null, _sum: { amount: 50000 }, _count: 2 },
      ]);
      prisma.expenseCategory.findMany.mockResolvedValue([{ id: 'c1', name: 'Arriendo', color: '#8b5cf6' }]);

      const r: any = await service.summary({ from: '2026-09-01', to: '2026-09-30' });

      expect(r.ingresos).toBe(1000000);
      expect(r.cogs).toBe(600000);
      expect(r.margenBruto).toBe(400000);
      expect(r.comprasStock).toBe(300000);
      expect(r.gastosOp).toBe(150000);
      expect(r.utilidadNeta).toBe(250000);
      expect(r.porCategoria).toHaveLength(2);
      expect(r.porCategoria[0]).toEqual(
        expect.objectContaining({ name: 'Arriendo', total: 100000 }),
      );
      expect(r.porCategoria[1]).toEqual(
        expect.objectContaining({ name: 'Sin categoría', total: 50000 }),
      );
    });
  });
});
