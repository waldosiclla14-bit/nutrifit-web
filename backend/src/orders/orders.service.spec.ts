import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { RemindersService } from '../reminders/reminders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    $queryRaw: jest.Mock;
    $executeRaw: jest.Mock;
    $transaction: jest.Mock;
    order: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; findMany: jest.Mock; count: jest.Mock; aggregate: jest.Mock; groupBy: jest.Mock; delete: jest.Mock; deleteMany: jest.Mock };
    productVariant: { findMany: jest.Mock; findUnique: jest.Mock };
    customer: { update: jest.Mock };
    auditLog: { create: jest.Mock };
    inventoryMovement: { create: jest.Mock };
    orderItem: { deleteMany: jest.Mock; groupBy: jest.Mock };
    coupon: { updateMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
      $transaction: jest.fn(),
      order: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      productVariant: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      customer: { update: jest.fn() },
      auditLog: { create: jest.fn() },
      inventoryMovement: { create: jest.fn() },
      orderItem: { deleteMany: jest.fn(), groupBy: jest.fn() },
      coupon: { updateMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CouponsService, useValue: { validateCoupon: jest.fn(), consumeCoupon: jest.fn() } },
        { provide: RemindersService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('validateOrderPayload (private, tested via create)', () => {
    it('rejects empty items array', async () => {
      await expect(
        service.create({
          items: [],
          customerId: 'c1',
          customerName: 'Test',
          customerPhone: '1234567890',
          deliveryType: 'METRO',
          paymentMethod: 'EFECTIVO',
          subtotal: 1000,
          total: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects more than 100 items', async () => {
      const items = Array.from({ length: 101 }, (_, i) => ({
        productId: `p${i}`,
        variantId: `v${i}`,
        productName: `Product ${i}`,
        variantName: '',
        sku: `SKU-${i}`,
        unitPrice: 1000,
        quantity: 1,
        total: 1000,
      }));
      await expect(
        service.create({
          items,
          customerId: 'c1',
          customerName: 'Test',
          customerPhone: '1234567890',
          deliveryType: 'METRO',
          paymentMethod: 'EFECTIVO',
          subtotal: 101000,
          total: 101000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects missing customerId', async () => {
      await expect(
        service.create({
          items: [{ productId: 'p1', variantId: 'v1', productName: 'P', variantName: '', sku: 'S', unitPrice: 1000, quantity: 1, total: 1000 }],
          customerId: '',
          customerName: 'Test',
          customerPhone: '1234567890',
          deliveryType: 'METRO',
          paymentMethod: 'EFECTIVO',
          subtotal: 1000,
          total: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects short customerName', async () => {
      await expect(
        service.create({
          items: [{ productId: 'p1', variantId: 'v1', productName: 'P', variantName: '', sku: 'S', unitPrice: 1000, quantity: 1, total: 1000 }],
          customerId: 'c1',
          customerName: 'A',
          customerPhone: '1234567890',
          deliveryType: 'METRO',
          paymentMethod: 'EFECTIVO',
          subtotal: 1000,
          total: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects mismatched totals', async () => {
      await expect(
        service.create({
          items: [{ productId: 'p1', variantId: 'v1', productName: 'P', variantName: '', sku: 'S', unitPrice: 1000, quantity: 1, total: 1000 }],
          customerId: 'c1',
          customerName: 'Test',
          customerPhone: '1234567890',
          deliveryType: 'METRO',
          paymentMethod: 'EFECTIVO',
          subtotal: 2000,
          total: 2000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects line total mismatch', async () => {
      await expect(
        service.create({
          items: [{ productId: 'p1', variantId: 'v1', productName: 'P', variantName: '', sku: 'S', unitPrice: 1000, quantity: 2, total: 1000 }],
          customerId: 'c1',
          customerName: 'Test',
          customerPhone: '1234567890',
          deliveryType: 'METRO',
          paymentMethod: 'EFECTIVO',
          subtotal: 1000,
          total: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects negative subtotal', async () => {
      await expect(
        service.create({
          items: [{ productId: 'p1', variantId: 'v1', productName: 'P', variantName: '', sku: 'S', unitPrice: 1000, quantity: 1, total: 1000 }],
          customerId: 'c1',
          customerName: 'Test',
          customerPhone: '1234567890',
          deliveryType: 'METRO',
          paymentMethod: 'EFECTIVO',
          subtotal: -500,
          total: -500,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateOrderNumber (private, tested via behavior)', () => {
    it('generates sequential NF-XXXXXX format', async () => {
      // Mock the counter to return sequential numbers
      prisma.$queryRaw
        .mockResolvedValueOnce([{ next: 1 }])
        .mockResolvedValueOnce([{ max_num: BigInt(0) }]);
      prisma.$executeRaw.mockResolvedValue(undefined);
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([]);
      prisma.$transaction.mockResolvedValue([{ id: 'order-1', orderNumber: 'NF-000001' }]);
      prisma.productVariant.findUnique.mockResolvedValue(null);

      const result = await service.create({
        items: [{ productId: 'p1', variantId: null, productName: 'P', variantName: '', sku: 'S', unitPrice: 1000, quantity: 1, total: 1000 }],
        customerId: 'c1',
        customerName: 'Test User',
        customerPhone: '1234567890',
        deliveryType: 'METRO',
        paymentMethod: 'EFECTIVO',
        subtotal: 1000,
        total: 1000,
      });

      expect(result.orderNumber).toMatch(/^NF-\d{6}$/);
    });

    it('retries on P2002 collision', async () => {
      const collisionError = new Error('Unique constraint') as any;
      collisionError.code = 'P2002';

      prisma.$queryRaw
        .mockResolvedValueOnce([{ next: 1 }])
        .mockResolvedValueOnce([{ next: 2 }]);
      prisma.$executeRaw.mockResolvedValue(undefined);
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([]);

      let callCount = 0;
      prisma.$transaction.mockImplementation(async (fns: any[]) => {
        callCount++;
        if (callCount === 1) throw collisionError;
        return [{ id: 'order-2', orderNumber: 'NF-000002' }];
      });
      prisma.productVariant.findUnique.mockResolvedValue(null);

      const result = await service.create({
        items: [{ productId: 'p1', variantId: null, productName: 'P', variantName: '', sku: 'S', unitPrice: 1000, quantity: 1, total: 1000 }],
        customerId: 'c1',
        customerName: 'Test User',
        customerPhone: '1234567890',
        deliveryType: 'METRO',
        paymentMethod: 'EFECTIVO',
        subtotal: 1000,
        total: 1000,
      });

      expect(result.orderNumber).toMatch(/^NF-\d{6}$/);
      expect(callCount).toBe(2);
    });
  });

  describe('stock validation', () => {
    it('rejects when variant has insufficient stock', async () => {
      prisma.$executeRaw.mockResolvedValue(undefined);
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([
        {
          id: 'v1',
          variantName: '2kg',
          stock: 5,
          reservedStock: 0,
          price: 30000,
          costPrice: 20000,
          product: { id: 'p1', name: 'Whey', basePrice: 30000, costPrice: 20000 },
        },
      ]);

      await expect(
        service.create({
          items: [{ productId: 'p1', variantId: 'v1', productName: 'Whey', variantName: '2kg', sku: 'W-2K', unitPrice: 30000, quantity: 10, total: 300000 }],
          customerId: 'c1',
          customerName: 'Test User',
          customerPhone: '1234567890',
          deliveryType: 'METRO',
          paymentMethod: 'EFECTIVO',
          subtotal: 300000,
          total: 300000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts when stock is sufficient', async () => {
      prisma.$queryRaw.mockResolvedValue([{ next: 1 }]);
      prisma.$executeRaw.mockResolvedValue(undefined);
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany
        .mockResolvedValueOnce([
          {
            id: 'v1',
            variantName: '2kg',
            stock: 10,
            reservedStock: 0,
            price: 30000,
            costPrice: 20000,
            product: { id: 'p1', name: 'Whey', basePrice: 30000, costPrice: 20000 },
          },
        ])
        .mockResolvedValueOnce([
          { id: 'v1', reservedStock: 2, stock: 10, variantName: '2kg' },
        ]);
      prisma.$transaction.mockResolvedValue([{ id: 'order-1', orderNumber: 'NF-000001' }]);

      const result = await service.create({
        items: [{ productId: 'p1', variantId: 'v1', productName: 'Whey', variantName: '2kg', sku: 'W-2K', unitPrice: 30000, quantity: 2, total: 60000 }],
        customerId: 'c1',
        customerName: 'Test User',
        customerPhone: '1234567890',
        deliveryType: 'METRO',
        paymentMethod: 'EFECTIVO',
        subtotal: 60000,
        total: 60000,
      });

      expect(result).toBeDefined();
    });

    it('rejects price mismatch from DB price', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([
        {
          id: 'v1',
          variantName: '2kg',
          stock: 10,
          reservedStock: 0,
          price: 30000,
          costPrice: 20000,
          product: { id: 'p1', name: 'Whey', basePrice: 30000, costPrice: 20000 },
        },
      ]);

      await expect(
        service.create({
          items: [{ productId: 'p1', variantId: 'v1', productName: 'Whey', variantName: '2kg', sku: 'W-2K', unitPrice: 25000, quantity: 1, total: 25000 }],
          customerId: 'c1',
          customerName: 'Test User',
          customerPhone: '1234567890',
          deliveryType: 'METRO',
          paymentMethod: 'EFECTIVO',
          subtotal: 25000,
          total: 25000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('idempotency', () => {
    it('returns existing order when idempotencyKey matches', async () => {
      const existingOrder = {
        id: 'existing-1',
        orderNumber: 'NF-000099',
        customer: { id: 'c1' },
        items: [],
      };
      prisma.order.findUnique.mockResolvedValue(existingOrder);

      const result = await service.create({
        idempotencyKey: 'test-key-123',
        items: [{ productId: 'p1', variantId: null, productName: 'P', variantName: '', sku: 'S', unitPrice: 1000, quantity: 1, total: 1000 }],
        customerId: 'c1',
        customerName: 'Test User',
        customerPhone: '1234567890',
        deliveryType: 'METRO',
        paymentMethod: 'EFECTIVO',
        subtotal: 1000,
        total: 1000,
      });

      expect(result.id).toBe('existing-1');
      expect(prisma.order.create).not.toHaveBeenCalled();
    });
  });

  describe('payment validation', () => {
    it('rejects invalid payment method', async () => {
      await expect(
        service.create({
          items: [{ productId: 'p1', variantId: null, productName: 'P', variantName: '', sku: 'S', unitPrice: 1000, quantity: 1, total: 1000 }],
          customerId: 'c1',
          customerName: 'Test User',
          customerPhone: '1234567890',
          deliveryType: 'METRO',
          paymentMethod: 'BITCOIN',
          subtotal: 1000,
          total: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts valid payment methods', async () => {
      prisma.$queryRaw.mockResolvedValue([{ next: 1 }]);
      prisma.$executeRaw.mockResolvedValue(undefined);
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([]);
      prisma.$transaction.mockResolvedValue([{ id: 'order-1', orderNumber: 'NF-000001' }]);
      prisma.productVariant.findUnique.mockResolvedValue(null);

      const result = await service.create({
        items: [{ productId: 'p1', variantId: null, productName: 'P', variantName: '', sku: 'S', unitPrice: 1000, quantity: 1, total: 1000 }],
        customerId: 'c1',
        customerName: 'Test User',
        customerPhone: '1234567890',
        deliveryType: 'METRO',
        paymentMethod: 'TRANSFERENCIA',
        subtotal: 1000,
        total: 1000,
      });

      expect(result).toBeDefined();
    });
  });

  describe('delivery type validation', () => {
    it('rejects invalid delivery type', async () => {
      await expect(
        service.create({
          items: [{ productId: 'p1', variantId: null, productName: 'P', variantName: '', sku: 'S', unitPrice: 1000, quantity: 1, total: 1000 }],
          customerId: 'c1',
          customerName: 'Test User',
          customerPhone: '1234567890',
          deliveryType: 'DRONE',
          paymentMethod: 'EFECTIVO',
          subtotal: 1000,
          total: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteOrder', () => {
    it('rejects deleting non-existent order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.deleteOrder('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('rejects deleting paid orders', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: 'PAID',
        items: [],
      });
      await expect(service.deleteOrder('o1')).rejects.toThrow(BadRequestException);
    });

    it('allows deleting pending orders', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: 'PENDING',
        items: [{ variantId: 'v1', quantity: 2 }],
      });
      prisma.$transaction.mockResolvedValue(undefined);

      const result = await service.deleteOrder('o1');
      expect(result.deleted).toBe(true);
    });
  });
});
