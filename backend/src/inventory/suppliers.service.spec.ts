import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      supplier: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
  });

  describe('findAll', () => {
    it('returns active suppliers with product count', async () => {
      const mock = [{ id: 's1', name: 'Proveedor A', isActive: true, _count: { products: 5 } }];
      prisma.supplier.findMany.mockResolvedValue(mock);

      const result = await service.findAll();
      expect(result).toEqual(mock);
      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns supplier by id', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 's1', name: 'Test', products: [] });
      const result = await service.findOne('s1');
      expect(result.id).toBe('s1');
    });

    it('throws for non-existent supplier', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates supplier with name', async () => {
      prisma.supplier.create.mockResolvedValue({ id: 's1', name: 'New Supplier', paymentTerms: 'CONTADO' });
      const result = await service.create({ name: 'New Supplier', paymentTerms: 'CONTADO' });
      expect(result.name).toBe('New Supplier');
    });
  });

  describe('update', () => {
    it('updates supplier fields', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 's1', name: 'Old' });
      prisma.supplier.update.mockResolvedValue({ id: 's1', name: 'Updated' });
      const result = await service.update('s1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('throws for non-existent supplier', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes supplier', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 's1', name: 'Test' });
      prisma.supplier.update.mockResolvedValue({ id: 's1', isActive: false });
      const result = await service.remove('s1');
      expect(result.isActive).toBe(false);
    });

    it('throws for non-existent supplier', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
