import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PurchasesService confirm/cancel', () => {
  let service: PurchasesService;
  let prisma: {
    $executeRaw: jest.Mock;
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
    purchase: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
    purchaseItem: { update: jest.Mock };
    productVariant: { findMany: jest.Mock; update: jest.Mock };
    inventoryMovement: { create: jest.Mock };
    productCostHistory: { create: jest.Mock };
    goodsReceipt: { create: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      $transaction: jest.fn(),
      purchase: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
      purchaseItem: { update: jest.fn() },
      productVariant: { findMany: jest.fn(), update: jest.fn() },
      inventoryMovement: { create: jest.fn() },
      productCostHistory: { create: jest.fn() },
      goodsReceipt: { create: jest.fn(), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PurchasesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
  });

  describe('confirm', () => {
    it('confirms only PENDING_REVIEW with atomic guard', async () => {
      prisma.purchase.findUnique.mockResolvedValue({ id: 'p1', status: 'PENDING_REVIEW' });
      prisma.purchase.update.mockResolvedValue({ id: 'p1', status: 'CONFIRMED' });

      const res: any = await service.confirm('p1', 'u1');

      expect(res.status).toBe('CONFIRMED');
      expect(prisma.purchase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'p1', status: 'PENDING_REVIEW' }),
          data: expect.objectContaining({ status: 'CONFIRMED', confirmedById: 'u1' }),
        }),
      );
    });

    it('rejects DRAFT, CONFIRMED and missing', async () => {
      prisma.purchase.findUnique.mockResolvedValue({ id: 'p1', status: 'DRAFT' });
      await expect(service.confirm('p1')).rejects.toThrow('pendientes de revision');

      prisma.purchase.findUnique.mockResolvedValue({ id: 'p1', status: 'CONFIRMED' });
      await expect(service.confirm('p1')).rejects.toThrow('pendientes de revision');

      prisma.purchase.findUnique.mockResolvedValue(null);
      await expect(service.confirm('p1')).rejects.toThrow(NotFoundException);
    });

    it('loser of confirm-vs-cancel race gets friendly error', async () => {
      const p2025 = Object.assign(new Error('No record found'), { code: 'P2025' });
      prisma.purchase.findUnique
        .mockResolvedValueOnce({ id: 'p1', status: 'PENDING_REVIEW' })
        .mockResolvedValueOnce({ status: 'CANCELLED' });
      prisma.purchase.update.mockRejectedValueOnce(p2025);

      await expect(service.confirm('p1')).rejects.toThrow('ya no está pendiente de revisión');
    });
  });

  describe('cancel', () => {
    it('blocks received goods and partial receipts', async () => {
      prisma.purchase.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'RECEIVED',
        items: [{ receivedQty: 5 }],
      });
      await expect(service.cancel('p1')).rejects.toThrow('mercadería recibida');

      prisma.purchase.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'RECEIVING',
        items: [{ receivedQty: 2 }, { receivedQty: 0 }],
      });
      await expect(service.cancel('p1')).rejects.toThrow('mercadería recibida');
    });

    it('allows cancel before any receipt', async () => {
      prisma.purchase.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'CONFIRMED',
        items: [{ receivedQty: 0 }],
      });
      prisma.purchase.update.mockResolvedValue({ id: 'p1', status: 'CANCELLED' });

      const res: any = await service.cancel('p1');
      expect(res.status).toBe('CANCELLED');
    });
  });

  describe('create idempotency and rounding', () => {
    const item = {
      productName: 'Whey',
      quantity: 2,
      unitCost: 19999.5,
      discount: 0,
      tax: 0,
    };

    it('returns existing purchase for repeated idempotencyKey', async () => {
      prisma.purchase.findUnique.mockResolvedValue({ id: 'dup-1', purchaseNumber: 'COMP-000001' });

      const res: any = await service.create({
        idempotencyKey: 'key-123',
        items: [{ ...item }],
      } as any);

      expect(res.id).toBe('dup-1');
      expect(prisma.purchase.create).not.toHaveBeenCalled();
    });

    it('rounds fractional costs to integer CLP', async () => {
      prisma.purchase.findUnique.mockResolvedValue(null);
      prisma.$executeRaw.mockResolvedValue(undefined);
      prisma.$queryRaw.mockResolvedValue([{ next: 7 }]);
      prisma.purchase.create.mockImplementation((args: any) => Promise.resolve({ id: 'p1', ...args.data }));

      const res: any = await service.create({ items: [{ ...item }] } as any);

      expect(res.subtotal).toBe(39999); // 2 x 19999.5 redondeado a entero
      expect(res.total).toBe(39999);
      const line = prisma.purchase.create.mock.calls[0][0].data.items.create[0];
      expect(line.unitCost).toBe(20000);
      expect(line.totalCost).toBe(39999);
    });
  });

  describe('createReceipt validation', () => {
    const purchaseBase: any = {
      id: 'p1',
      status: 'CONFIRMED',
      purchaseNumber: 'COMP-000001',
      items: [{ id: 'pi-1', quantity: 10, receivedQty: 4, unitCost: 20000, variantId: 'v1', productId: 'p1' }],
    };

    it('rejects negative, fractional, foreign, duplicate and over-receiving lines', async () => {
      prisma.purchase.findUnique.mockResolvedValue(purchaseBase);

      await expect(
        service.createReceipt('p1', { items: [{ purchaseItemId: 'pi-1', receivedQty: -1 }] }, 'u1'),
      ).rejects.toThrow('cantidades inválidas');

      await expect(
        service.createReceipt('p1', { items: [{ purchaseItemId: 'pi-1', receivedQty: 1.5 }] }, 'u1'),
      ).rejects.toThrow('cantidades inválidas');

      await expect(
        service.createReceipt('p1', { items: [{ purchaseItemId: 'otro', receivedQty: 1 }] }, 'u1'),
      ).rejects.toThrow('no pertenece a esta compra');

      await expect(
        service.createReceipt('p1', {
          items: [
            { purchaseItemId: 'pi-1', receivedQty: 1 },
            { purchaseItemId: 'pi-1', receivedQty: 1 },
          ],
        }, 'u1'),
      ).rejects.toThrow('duplicado');

      // ya recibió 4 de 10 → 7 más supera
      await expect(
        service.createReceipt('p1', { items: [{ purchaseItemId: 'pi-1', receivedQty: 7 }] }, 'u1'),
      ).rejects.toThrow('supera lo comprado');

      await expect(
        service.createReceipt('p1', { items: [{ purchaseItemId: 'pi-1', receivedQty: 1, damagedQty: 2 }] }, 'u1'),
      ).rejects.toThrow('dañados no puede superar');
    });

    it('completes receipt in one non-interactive tx (pgbouncer-safe)', async () => {
      prisma.purchase.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'CONFIRMED',
        purchaseNumber: 'COMP-000001',
        receivedAt: null,
        items: [{ id: 'pi-1', quantity: 10, receivedQty: 4, unitCost: 20000, variantId: 'v1', productId: 'p1' }],
      });
      prisma.productVariant.findMany.mockResolvedValue([{ id: 'v1', physicalStock: 5, costPrice: 18000 }]);
      prisma.$queryRaw.mockResolvedValue([{ next: 3 }]);
      prisma.$executeRaw.mockResolvedValue(undefined);
      prisma.$transaction.mockImplementation(async (writes: any[]) => {
        // Simula el retorno: primer write = receipt creado
        return [{ id: 'rec-uuid-1', receiptNumber: 'REC-000003' }];
      });

      const res: any = await service.createReceipt(
        'p1',
        { items: [{ purchaseItemId: 'pi-1', receivedQty: 6, damagedQty: 0 }] },
        'u1',
      );

      expect(res.receiptNumber).toBe('REC-000003');
      // Receipt con id propio + stock + movimiento + costo + estados
      expect(prisma.goodsReceipt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: expect.any(String), purchaseId: 'p1' }),
        }),
      );
      expect(prisma.purchaseItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pi-1' }, data: { receivedQty: 10 } }),
      );
      expect(prisma.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'v1' }, data: { physicalStock: 11 } }),
      );
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ variantId: 'v1', type: 'PURCHASE_RECEIPT', quantity: 6 }),
        }),
      );
      expect(prisma.productCostHistory.create).toHaveBeenCalled();
      expect(prisma.purchase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RECEIVED', receiptStatus: 'COMPLETED' }),
        }),
      );
      // Una sola transacción con array (no interactiva)
      expect(prisma.$transaction.mock.calls[0][0]).toBeInstanceOf(Array);
    });
  });
});
