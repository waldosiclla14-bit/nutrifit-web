import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PurchasesService confirm/cancel', () => {
  let service: PurchasesService;
  let prisma: {
    purchase: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      purchase: { findUnique: jest.fn(), update: jest.fn() },
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
});
