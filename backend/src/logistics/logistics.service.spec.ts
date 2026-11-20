import { LogisticsService } from './logistics.service';
import { DeliveryStatus } from '@prisma/client';

function buildDelivery(overrides: any = {}) {
  const { order: orderOverrides = {}, ...rest } = overrides;
  return {
    id: 'del-1',
    orderId: 'ord-1',
    deliveryDay: '2026-11-19',
    deliveredAt: new Date('2026-11-19T15:00:00Z'),
    status: DeliveryStatus.DELIVERED,
    assignedUser: { id: 'courier-1', name: 'Juan Repartidor' },
    order: {
      orderNumber: 'NF-100001',
      customerName: 'Cliente Test',
      subtotal: 27500,
      discount: 0,
      shippingCost: 1000,
      totalCost: 17500,
      items: [],
      ...orderOverrides,
    },
    ...rest,
  };
}

function buildPrismaMock() {
  const prisma: any = {
    logisticsConfig: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'cfg-1',
        courierCost: 2500,
        customerFee: 1000,
        nutrifitSubsidy: 1500,
        effectiveFrom: new Date('2026-01-01'),
        isActive: true,
      }),
      create: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    deliveryProfitability: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(async ({ data }: any) => ({ id: 'profit-1', ...data })),
      update: jest.fn(async ({ data }: any) => ({ id: 'profit-1', ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: {}, _count: { id: 0 } }),
    },
    delivery: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    courierSettlement: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(async ({ data }: any) => data),
      update: jest.fn(async ({ data }: any) => ({ id: 'set-1', ...data })),
      aggregate: jest.fn().mockResolvedValue({ _sum: {}, _count: { id: 0 } }),
    },
    courierSettlementItem: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'courier-1', name: 'Juan Repartidor', role: 'DELIVERY' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
  return prisma;
}

describe('LogisticsService — rentabilidad y liquidación', () => {
  let prisma: any;
  let service: LogisticsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new LogisticsService(prisma);
  });

  it('Caso A: Pack Whey + Creatina (27500 venta / 17500 costo / 1000 cobro / 2500 pago)', async () => {
    prisma.delivery.findUnique.mockResolvedValue(buildDelivery());

    const entry: any = await service.snapshotDelivery('del-1');

    expect(entry.productRevenue).toBe(27500);
    expect(entry.productCost).toBe(17500);
    expect(entry.grossProfit).toBe(10000);
    expect(entry.customerDeliveryFee).toBe(1000);
    expect(entry.courierCost).toBe(2500);
    expect(entry.nutrifitSubsidy).toBe(1500);
    expect(entry.netProfit).toBe(8500);
    expect(entry.operatingResult).toBe(8500);
  });

  it('Caso B: Óxido Nítrico (15000 venta / 6000 costo) => 7500 después de logística', async () => {
    prisma.delivery.findUnique.mockResolvedValue(
      buildDelivery({ order: { subtotal: 15000, totalCost: 6000 } }),
    );

    const entry: any = await service.snapshotDelivery('del-1');

    expect(entry.grossProfit).toBe(9000);
    expect(entry.netProfit).toBe(7500);
  });

  it('Pedido sin cobro de entrega: subsidio completo de 2500', async () => {
    prisma.delivery.findUnique.mockResolvedValue(
      buildDelivery({ order: { subtotal: 15000, totalCost: 6000, shippingCost: 0 } }),
    );

    const entry: any = await service.snapshotDelivery('del-1');

    expect(entry.customerDeliveryFee).toBe(0);
    expect(entry.nutrifitSubsidy).toBe(2500);
    expect(entry.netProfit).toBe(6500);
  });

  it('Pedido con descuento: la ganancia usa subtotal - descuento', async () => {
    prisma.delivery.findUnique.mockResolvedValue(
      buildDelivery({ order: { subtotal: 30000, discount: 2500, totalCost: 17500 } }),
    );

    const entry: any = await service.snapshotDelivery('del-1');

    expect(entry.productRevenue).toBe(27500);
    expect(entry.grossProfit).toBe(10000);
    expect(entry.netProfit).toBe(8500);
  });

  it('Entrega cancelada/fallida no genera obligación automática', async () => {
    prisma.delivery.findUnique.mockResolvedValue(
      buildDelivery({ status: DeliveryStatus.CANCELLED }),
    );

    const entry = await service.snapshotDelivery('del-1');

    expect(entry).toBeNull();
    expect(prisma.deliveryProfitability.create).not.toHaveBeenCalled();
  });

  it('No duplica ni recalcula una entrega ya liquidada (tarifas históricas intactas)', async () => {
    const existing = {
      id: 'profit-1',
      deliveryId: 'del-1',
      settlementStatus: 'LIQUIDADO',
      settlementId: 'set-1',
      courierCost: 2500,
      netProfit: 8500,
    };
    prisma.deliveryProfitability.findUnique.mockResolvedValue(existing);
    prisma.delivery.findUnique.mockResolvedValue(buildDelivery());

    const entry = await service.snapshotDelivery('del-1');

    expect(entry).toBe(existing);
    expect(prisma.deliveryProfitability.create).not.toHaveBeenCalled();
    expect(prisma.deliveryProfitability.update).not.toHaveBeenCalled();
  });

  it('Reactiva una entrega anulada que luego se entrega, sin recalcular montos', async () => {
    const existing = {
      id: 'profit-1',
      deliveryId: 'del-1',
      settlementStatus: 'ANULADO',
      settlementId: null,
      courierId: 'courier-1',
      courierCost: 2500,
      netProfit: 8500,
    };
    prisma.deliveryProfitability.findUnique.mockResolvedValue(existing);
    prisma.deliveryProfitability.update.mockResolvedValue({ ...existing, settlementStatus: 'PENDIENTE' });
    prisma.delivery.findUnique.mockResolvedValue(buildDelivery());

    const entry: any = await service.snapshotDelivery('del-1');

    expect(prisma.deliveryProfitability.create).not.toHaveBeenCalled();
    expect(prisma.deliveryProfitability.update).toHaveBeenCalledWith({
      where: { id: 'profit-1' },
      data: expect.objectContaining({ settlementStatus: 'PENDIENTE' }),
    });
    expect(entry.settlementStatus).toBe('PENDIENTE');
  });

  it('Rechaza liquidar una entrega ya liquidada', async () => {
    prisma.deliveryProfitability.findMany.mockResolvedValue([
      {
        id: 'profit-1',
        orderNumber: 'NF-1',
        courierCost: 2500,
        courierId: 'courier-1',
        settlementStatus: 'LIQUIDADO',
        settlementId: 'set-old',
        deliveryDay: '2026-11-19',
      },
    ]);

    await expect(service.createSettlement({ entryIds: ['profit-1'] })).rejects.toThrow(
      'ya fue liquidada o anulada',
    );
  });

  it('Cambiar tarifas crea una versión nueva y desactiva la anterior', async () => {
    prisma.logisticsConfig.create.mockResolvedValue({
      id: 'cfg-2',
      courierCost: 3000,
      customerFee: 1200,
      nutrifitSubsidy: 1800,
      isActive: true,
    });

    const created: any = await service.updateConfig(
      { courierCost: 3000, customerFee: 1200, nutrifitSubsidy: 1800 },
      'admin-1',
    );

    expect(prisma.logisticsConfig.updateMany).toHaveBeenCalledWith({
      where: { isActive: true },
      data: { isActive: false },
    });
    expect(prisma.logisticsConfig.create).toHaveBeenCalled();
    expect(created.id).toBe('cfg-2');
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('Pedido con varios productos: reconstruye costo desde items cuando totalCost es 0', async () => {
    prisma.delivery.findUnique.mockResolvedValue(
      buildDelivery({
        order: {
          subtotal: 40000,
          shippingCost: 1000,
          totalCost: 0,
          items: [
            { quantity: 2, unitCost: 5000, variant: null, product: null },
            { quantity: 1, unitCost: 0, variant: { costPrice: 7000 }, product: null },
          ],
        },
      }),
    );

    const entry: any = await service.snapshotDelivery('del-1');

    expect(entry.productRevenue).toBe(40000);
    expect(entry.productCost).toBe(17000);
    expect(entry.grossProfit).toBe(23000);
    expect(entry.netProfit).toBe(21500);
  });

  it('Pedido con entrega subsidiada completamente: subsidio igual al costo del repartidor', async () => {
    prisma.logisticsConfig.findFirst.mockResolvedValue({
      id: 'cfg-sub',
      courierCost: 4000,
      customerFee: 0,
      nutrifitSubsidy: 4000,
      effectiveFrom: new Date('2026-01-01'),
      isActive: true,
    });
    prisma.delivery.findUnique.mockResolvedValue(
      buildDelivery({ order: { subtotal: 20000, totalCost: 8000, shippingCost: 0 } }),
    );

    const entry: any = await service.snapshotDelivery('del-1');

    expect(entry.customerDeliveryFee).toBe(0);
    expect(entry.courierCost).toBe(4000);
    expect(entry.nutrifitSubsidy).toBe(4000);
    expect(entry.logisticsResult).toBe(-4000);
    expect(entry.netProfit).toBe(8000);
  });

  it('Entrega fallida (NOT_DELIVERED) no genera obligación de pago', async () => {
    prisma.delivery.findUnique.mockResolvedValue(
      buildDelivery({ status: DeliveryStatus.NOT_DELIVERED }),
    );

    const entry = await service.snapshotDelivery('del-1');

    expect(entry).toBeNull();
    expect(prisma.deliveryProfitability.create).not.toHaveBeenCalled();
  });

  it('Entrega fallida con registro previo lo anula, no lo deja pendiente', async () => {
    const existing = {
      id: 'profit-1',
      deliveryId: 'del-1',
      settlementStatus: 'PENDIENTE',
      settlementId: null,
      chargeType: 'ENTREGA_REALIZADA',
      courierCost: 2500,
    };
    prisma.deliveryProfitability.findUnique.mockResolvedValue(existing);
    prisma.deliveryProfitability.update.mockResolvedValue({ ...existing, settlementStatus: 'ANULADO' });
    prisma.delivery.findUnique.mockResolvedValue(
      buildDelivery({ status: DeliveryStatus.CUSTOMER_UNAVAILABLE }),
    );

    const entry: any = await service.snapshotDelivery('del-1');

    expect(prisma.deliveryProfitability.update).toHaveBeenCalledWith({
      where: { id: 'profit-1' },
      data: { settlementStatus: 'ANULADO' },
    });
    expect(entry.settlementStatus).toBe('ANULADO');
  });

  it('Modificar tarifas no altera operaciones históricas ya snapshotadas', async () => {
    let created: any;
    prisma.deliveryProfitability.create.mockImplementation(async ({ data }: any) => {
      created = { id: 'profit-1', ...data };
      return created;
    });
    prisma.delivery.findUnique.mockResolvedValue(buildDelivery());

    const first: any = await service.snapshotDelivery('del-1');
    expect(first.courierCost).toBe(2500);
    expect(first.netProfit).toBe(8500);

    prisma.logisticsConfig.create.mockResolvedValue({
      id: 'cfg-2',
      courierCost: 3000,
      customerFee: 1200,
      nutrifitSubsidy: 1800,
      isActive: true,
    });
    await service.updateConfig(
      { courierCost: 3000, customerFee: 1200, nutrifitSubsidy: 1800 },
      'admin-1',
    );

    prisma.deliveryProfitability.findUnique.mockResolvedValue(created);
    const again: any = await service.snapshotDelivery('del-1');

    expect(again.courierCost).toBe(2500);
    expect(again.customerDeliveryFee).toBe(1000);
    expect(again.netProfit).toBe(8500);
    expect(again.configSnapshot.courierCost).toBe(2500);
    expect(prisma.deliveryProfitability.create).toHaveBeenCalledTimes(1);
    expect(prisma.deliveryProfitability.update).not.toHaveBeenCalled();
  });
  it('Valida importes inválidos en backend', async () => {
    await expect(
      service.updateConfig({ courierCost: -1, customerFee: 1000 }),
    ).rejects.toThrow('Costo por entrega inválido');
    await expect(
      service.updateConfig({ courierCost: 2500, customerFee: 'abc' }),
    ).rejects.toThrow('Cobro al cliente inválido');
  });

  describe('liquidaciones parciales y completas', () => {
    const entry = (id: string, amount: number, day: string) => ({
      id,
      orderNumber: `NF-${id}`,
      courierCost: amount,
      courierId: 'courier-1',
      settlementStatus: 'PENDIENTE',
      settlementId: null,
      deliveryDay: day,
      orderId: `ord-${id}`,
      deliveryId: `del-${id}`,
    });

    beforeEach(() => {
      prisma.courierSettlement.findUnique
        .mockResolvedValueOnce(null) // generación del número
        .mockImplementationOnce(async () => ({
          id: 'set-1',
          settlementNumber: 'LIQ-20261119-1234',
          status: 'PENDIENTE',
          items: [],
        }));
      prisma.courierSettlement.create.mockResolvedValue({ id: 'set-1' });
    });

    it('liquidación parcial: solo incluye las entregas seleccionadas', async () => {
      prisma.deliveryProfitability.findMany.mockResolvedValue([entry('a', 2500, '2026-11-18')]);

      await service.createSettlement({ entryIds: ['a'] }, 'admin-1');

      expect(prisma.courierSettlementItem.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ profitabilityId: 'a', amount: 2500 })],
      });
      expect(prisma.courierSettlement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deliveriesCount: 1,
          totalAmount: 2500,
          periodFrom: '2026-11-18',
          periodTo: '2026-11-18',
        }),
      });
    });

    it('liquidación completa: suma todas las entregas y atribuye el repartidor', async () => {
      prisma.deliveryProfitability.findMany.mockResolvedValue([
        entry('a', 2500, '2026-11-18'),
        entry('b', 2500, '2026-11-19'),
      ]);

      await service.createSettlement({ entryIds: ['a', 'b'] }, 'admin-1');

      expect(prisma.courierSettlement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ deliveriesCount: 2, totalAmount: 5000 }),
      });
      expect(prisma.courierSettlementItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ profitabilityId: 'a' }),
          expect.objectContaining({ profitabilityId: 'b' }),
        ]),
      });
      expect(prisma.deliveryProfitability.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ courierId: 'courier-1', settlementId: expect.any(String) }),
        }),
      );
    });

    it('no confirma dos veces una liquidación ya pagada', async () => {
      prisma.courierSettlement.findUnique.mockReset();
      prisma.courierSettlement.findUnique.mockResolvedValue({
        id: 'set-1',
        status: 'LIQUIDADO',
        totalAmount: 5000,
      });

      await expect(
        service.confirmSettlement('set-1', { paymentMethod: 'TRANSFERENCIA' }, 'admin-1'),
      ).rejects.toThrow('ya fue pagada');
    });
  });
});
