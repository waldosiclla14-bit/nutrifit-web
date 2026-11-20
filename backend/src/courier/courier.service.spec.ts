import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { CourierService } from './courier.service';
import { DeliveryService } from '../delivery/delivery.service';
import { addDaysISO, todayChileISO } from '../common/date-range';

const HOY = todayChileISO();
const MANANA = addDaysISO(HOY, 1);

function card(overrides: Record<string, any> = {}) {
  return {
    id: 'd1',
    deliveryCode: '5832',
    deliveryDay: HOY,
    windowStart: '17:00',
    windowEnd: '17:30',
    status: DeliveryStatus.CONFIRMED,
    deliveryType: 'METRO',
    address: null,
    meetingPoint: 'Acceso principal',
    notes: null,
    failureReason: null,
    deliveredAt: null,
    station: { name: 'Baquedano', line: 'L1', lineName: 'Línea 1', commune: 'Santiago', latitude: -33.4, longitude: -70.6 },
    order: { orderNumber: 'NF-1', total: 25000, paymentMethod: 'EFECTIVO', paymentStatus: 'PENDING', customerName: 'Ana' },
    customer: { name: 'Ana', phone: '+56911111111' },
    ...overrides,
  };
}

describe('CourierService', () => {
  let service: CourierService;
  let prisma: any;
  let deliveryService: { updateStatus: jest.Mock };

  beforeEach(() => {
    prisma = {
      delivery: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      deliverySettings: { findMany: jest.fn().mockResolvedValue([]) },
      deliveryAuditLog: { create: jest.fn().mockResolvedValue({}) },
      deliveryCollection: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue({}),
      },
      deliveryProof: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      courierCashShift: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      courierActionReceipt: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };
    deliveryService = { updateStatus: jest.fn() };
    service = new CourierService(prisma, deliveryService as unknown as DeliveryService);
  });

  describe('getRoute', () => {
    it('filtra por el repartidor autenticado y por el día de hoy', async () => {
      prisma.delivery.findMany.mockResolvedValue([card()]);

      const route = await service.getRoute('u1');

      const where = prisma.delivery.findMany.mock.calls[0][0].where;
      expect(where.assignedTo).toBe('u1');
      expect(where.deliveryDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(route.entregas).toHaveLength(1);
      expect(route.resumen.pendientes).toBe(1);
    });

    it('no expone email, RUT ni historial del cliente', async () => {
      prisma.delivery.findMany.mockResolvedValue([card()]);

      const route = await service.getRoute('u1');
      const entrega = route.entregas[0];

      expect(Object.keys(entrega.cliente).sort()).toEqual(['nombre', 'telefono']);
      expect(JSON.stringify(route)).not.toContain('rut');
      expect(JSON.stringify(route)).not.toContain('email');
      expect(JSON.stringify(route)).not.toContain('totalSpent');
    });

    it('calcula monto a cobrar solo si el pedido no está pagado', async () => {
      prisma.delivery.findMany.mockResolvedValue([
        card(),
        card({ id: 'd2', order: { ...card().order, paymentStatus: 'CONFIRMED' } }),
      ]);

      const route = await service.getRoute('u1');

      expect(route.entregas[0].cobro).toEqual({ monto: 25000, estado: 'POR_COBRAR', metodo: 'EFECTIVO' });
      expect(route.entregas[1].cobro).toEqual({ monto: 0, estado: 'PAGADO', metodo: 'EFECTIVO' });
    });

    it('rechaza con 403 un día fuera de hoy/mañana', async () => {
      await expect(service.getRoute('u1', '2026-01-01')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('permite mañana y lo rechaza si está deshabilitado', async () => {
      prisma.delivery.findMany.mockResolvedValue([]);
      await expect(service.getRoute('u1', 'manana')).resolves.toBeDefined();

      prisma.deliverySettings.findMany.mockResolvedValue([
        { key: 'courier_tomorrow_enabled', value: false },
      ]);
      await expect(service.getRoute('u1', MANANA)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getDelivery', () => {
    it('solo devuelve entregas propias de hoy o mañana', async () => {
      prisma.delivery.findFirst.mockResolvedValue(card({ order: { ...card().order, items: [] } }));

      await service.getDelivery('u1', 'd1');

      const where = prisma.delivery.findFirst.mock.calls[0][0].where;
      expect(where.assignedTo).toBe('u1');
      expect(where.id).toBe('d1');
    });

    it('404 si no es su entrega', async () => {
      prisma.delivery.findFirst.mockResolvedValue(null);
      await expect(service.getDelivery('u1', 'd-ajena')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('rechaza estados fuera del alcance del repartidor', async () => {
      await expect(service.updateStatus('u1', 'd1', 'CANCELLED')).rejects.toThrow('Estado no permitido');
      expect(prisma.delivery.findUnique).not.toHaveBeenCalled();
    });

    it('404 si la entrega es de otro repartidor', async () => {
      prisma.delivery.findUnique.mockResolvedValue({ id: 'd1', assignedTo: 'u2', status: 'CONFIRMED' });

      await expect(service.updateStatus('u1', 'd1', 'IN_ROUTE')).rejects.toBeInstanceOf(NotFoundException);
      expect(deliveryService.updateStatus).not.toHaveBeenCalled();
    });

    it('exige motivo para cerrar sin éxito', async () => {
      prisma.delivery.findUnique.mockResolvedValue({ id: 'd1', assignedTo: 'u1', status: 'IN_ROUTE' });

      await expect(service.updateStatus('u1', 'd1', 'NOT_DELIVERED')).rejects.toThrow('motivo');
      await expect(service.updateStatus('u1', 'd1', 'NOT_DELIVERED', '  ')).rejects.toThrow('motivo');
      expect(deliveryService.updateStatus).not.toHaveBeenCalled();
    });

    it('ya no permite entregar sin POD por el endpoint genérico', async () => {
      await expect(service.updateStatus('u1', 'd1', 'DELIVERED')).rejects.toThrow('prueba de entrega');
      expect(deliveryService.updateStatus).not.toHaveBeenCalled();
    });

    it('no entregado guarda el motivo', async () => {
      prisma.delivery.findUnique.mockResolvedValue({ id: 'd1', assignedTo: 'u1', status: 'IN_ROUTE' });
      deliveryService.updateStatus.mockResolvedValue({
        id: 'd1',
        status: DeliveryStatus.NOT_DELIVERED,
        deliveredAt: null,
        failureReason: 'Cliente no llegó',
      });

      await service.updateStatus('u1', 'd1', 'NOT_DELIVERED', 'Cliente no llegó');

      expect(deliveryService.updateStatus).toHaveBeenCalledWith('d1', DeliveryStatus.NOT_DELIVERED, 'u1', {
        courier: true,
        reason: 'Cliente no llegó',
      });
    });
  });

  describe('requestReschedule', () => {
    it('deja la solicitud auditada sin cambiar el estado', async () => {
      prisma.delivery.findUnique.mockResolvedValue({ id: 'd1', assignedTo: 'u1', status: 'CONFIRMED' });

      await service.requestReschedule('u1', 'd1', 'Sin respuesta del cliente');

      expect(prisma.deliveryAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deliveryId: 'd1',
          userId: 'u1',
          action: 'RESCHEDULE_REQUESTED',
        }),
      });
      expect(deliveryService.updateStatus).not.toHaveBeenCalled();
    });

    it('exige motivo', async () => {
      await expect(service.requestReschedule('u1', 'd1', '')).rejects.toThrow('motivo');
    });
  });

  describe('getRendicion', () => {
    it('suma por método solo lo entregado y no pagado', async () => {
      prisma.delivery.findMany.mockResolvedValue([
        { status: 'DELIVERED', order: { total: 10000, paymentMethod: 'EFECTIVO', paymentStatus: 'PENDING' } },
        { status: 'DELIVERED', order: { total: 5000, paymentMethod: 'TRANSFERENCIA', paymentStatus: 'PENDING' } },
        { status: 'DELIVERED', order: { total: 7000, paymentMethod: 'EFECTIVO', paymentStatus: 'CONFIRMED' } },
        { status: 'CONFIRMED', order: { total: 9000, paymentMethod: 'EFECTIVO', paymentStatus: 'PENDING' } },
      ]);

      const r = await service.getRendicion('u1');

      expect(r.entregadas).toBe(3);
      expect(r.pendientes).toBe(1);
      expect(r.porRendir).toEqual({ efectivo: 10000, transferencia: 5000, otros: 0, total: 15000 });
      expect(r.cerrado).toBe(false);
    });

    it('se cierra cuando no quedan pendientes', async () => {
      prisma.delivery.findMany.mockResolvedValue([
        { status: 'DELIVERED', order: { total: 10000, paymentMethod: 'EFECTIVO', paymentStatus: 'PENDING' } },
      ]);
      const r = await service.getRendicion('u1');
      expect(r.cerrado).toBe(true);
    });

    it('usa los cobros reales cuando existen', async () => {
      prisma.delivery.findMany.mockResolvedValue([]);
      prisma.deliveryCollection.findMany.mockResolvedValue([
        { amount: 12000, method: 'EFECTIVO' },
        { amount: 8000, method: 'TRANSFERENCIA' },
      ]);

      const r = await service.getRendicion('u1');

      expect(r.porRendir).toEqual({ efectivo: 12000, transferencia: 8000, otros: 0, total: 20000 });
      expect(r.preliminar).toBe(false);
    });
  });

  describe('deliver (POD + cobro)', () => {
    const ownDelivery = (overrides: Record<string, any> = {}) => ({
      id: 'd1',
      assignedTo: 'u1',
      deliveryDay: HOY,
      deliveryCode: '5832',
      status: 'ARRIVED',
      order: { total: 25000, paymentStatus: 'PENDING', paymentMethod: 'EFECTIVO' },
      collection: null,
      proof: null,
      ...overrides,
    });

    beforeEach(() => {
      prisma.delivery.findUnique.mockResolvedValue(ownDelivery());
      prisma.deliveryCollection.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'c1', ...data }));
      prisma.deliveryProof.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'p1', ...data }));
      deliveryService.updateStatus.mockResolvedValue({
        id: 'd1',
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
      });
    });

    it('registra cobro, evidencia y cierra con el servicio existente', async () => {
      const result = await service.deliver('u1', 'd1', {
        amount: 25000,
        method: 'EFECTIVO',
        code: '5832',
        recipientName: 'Ana',
      });

      expect(prisma.deliveryCollection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ deliveryId: 'd1', courierId: 'u1', amount: 25000 }),
      });
      expect(prisma.deliveryProof.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ deliveryId: 'd1', code: '5832', recipientName: 'Ana' }),
      });
      expect(deliveryService.updateStatus).toHaveBeenCalledWith('d1', DeliveryStatus.DELIVERED, 'u1', {
        courier: true,
      });
      expect(prisma.deliveryAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'DELIVERED_WITH_POD', userId: 'u1' }),
      });
      expect(result.estado).toBe(DeliveryStatus.DELIVERED);
    });

    it('rechaza cobro distinto al del pedido', async () => {
      await expect(service.deliver('u1', 'd1', { amount: 100, code: '5832' })).rejects.toThrow('debe ser 25000');
      expect(deliveryService.updateStatus).not.toHaveBeenCalled();
    });

    it('exige código correcto o foto', async () => {
      await expect(service.deliver('u1', 'd1', { amount: 25000, code: '0000' })).rejects.toThrow('no coincide');
      await expect(service.deliver('u1', 'd1', { amount: 25000 })).rejects.toThrow('código de entrega o toma una foto');
    });

    it('acepta solo imágenes base64 y tamaño acotado', async () => {
      const dataUrl = `data:image/jpeg;base64,${Buffer.alloc(20).toString('base64')}`;
      await expect(service.deliver('u1', 'd1', { amount: 25000, photoDataUrl: dataUrl })).resolves.toBeDefined();
      await expect(
        service.deliver('u1', 'd1', { amount: 25000, photoDataUrl: 'javascript:alert(1)' }),
      ).rejects.toThrow('imagen');
    });

    it('reintenta sin volver a cobrar', async () => {
      prisma.delivery.findUnique.mockResolvedValue(
        ownDelivery({
          collection: { id: 'c1', amount: 25000, method: 'EFECTIVO', collectedAt: new Date() },
          proof: { id: 'p1', code: '5832' },
        }),
      );

      const result = await service.deliver('u1', 'd1', { amount: 25000, code: '5832' });

      expect(result.idempotente).toBe(true);
      expect(prisma.deliveryCollection.create).not.toHaveBeenCalled();
      expect(deliveryService.updateStatus).not.toHaveBeenCalled();
    });

    it('borra cobro y prueba si falla el cambio de estado', async () => {
      deliveryService.updateStatus.mockRejectedValue(new Error('transición inválida'));

      await expect(service.deliver('u1', 'd1', { amount: 25000, code: '5832' })).rejects.toThrow('transición');
      expect(prisma.deliveryCollection.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(prisma.deliveryProof.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });
  });

  describe('rendición y confirmación admin', () => {
    it('cierra el día calculando la diferencia declarada', async () => {
      prisma.deliveryCollection.findMany.mockResolvedValue([
        { amount: 10000, method: 'EFECTIVO' },
        { amount: 5000, method: 'TRANSFERENCIA' },
      ]);
      prisma.courierCashShift.upsert.mockImplementation((args: any) =>
        Promise.resolve({ id: 'turno1', ...args.update }),
      );

      const turno = await service.closeRendicion('u1', {
        declared: { efectivo: 9500, transferencia: 5000, otros: 0 },
      });

      expect(turno.diferencia).toBe(-500);
      expect(turno.estado).toBe('RENDIDA');
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'CASH_SHIFT_CLOSED', userId: 'u1' }),
      });
    });

    it('no deja cerrar con entregas pendientes', async () => {
      prisma.delivery.count.mockResolvedValue(2);
      await expect(service.closeRendicion('u1', {})).rejects.toThrow('sin estado final');
      expect(prisma.courierCashShift.upsert).not.toHaveBeenCalled();
    });

    it('confirma con diferencia y registra al actor', async () => {
      const shift = {
        id: 'turno1',
        status: 'RENDIDA',
        courierId: 'u1',
        day: HOY,
        expectedEfectivo: 10000,
        expectedTransferencia: 0,
        expectedOtro: 0,
        declaredEfectivo: 9500,
        declaredTransferencia: 0,
        declaredOtro: 0,
        notes: null,
      };
      const confirmed = { ...shift, status: 'CONFIRMADA', difference: -500 };
      prisma.courierCashShift.findUnique
        .mockResolvedValueOnce(shift)
        .mockResolvedValueOnce(confirmed);
      prisma.courierCashShift.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...shift, ...data }),
      );

      const result = await service.confirmRendicion('turno1', {}, 'admin1');

      expect(prisma.courierCashShift.update).toHaveBeenCalledWith({
        where: { id: 'turno1' },
        data: expect.objectContaining({ status: 'CONFIRMADA', confirmedById: 'admin1', difference: -500 }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'CASH_SHIFT_CONFIRMED', userId: 'admin1' }),
      });
      expect(result.diferencia).toBe(-500);
    });

    it('no expone la foto de una rendición ajena', async () => {
      prisma.courierCashShift.findUnique.mockResolvedValue({ id: 'turno1', courierId: 'u1', day: HOY });
      prisma.deliveryProof.findUnique.mockResolvedValue({
        delivery: { assignedTo: 'otro', deliveryDay: HOY, order: {} },
      });

      await expect(service.getProof('turno1', 'd1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('idempotencia de la cola offline', () => {
    it('replaya la respuesta sin ejecutar dos veces un cambio de estado', async () => {
      prisma.courierActionReceipt.findUnique.mockResolvedValue({
        id: 'accion-1',
        courierId: 'u1',
        action: 'STATUS',
        response: { id: 'd1', estado: 'IN_ROUTE' },
      });

      const result = await service.updateStatus('u1', 'd1', 'IN_ROUTE', undefined, 'accion-1');

      expect(result).toMatchObject({ id: 'd1', estado: 'IN_ROUTE', idempotente: true });
      expect(deliveryService.updateStatus).not.toHaveBeenCalled();
    });

    it('guarda un recibo con la clave de la acción', async () => {
      prisma.delivery.findUnique.mockResolvedValue({ id: 'd1', assignedTo: 'u1', deliveryDay: HOY, status: 'CONFIRMED' });
      deliveryService.updateStatus.mockResolvedValue({
        id: 'd1',
        status: 'IN_ROUTE',
        deliveredAt: null,
        failureReason: null,
      });

      await service.updateStatus('u1', 'd1', 'IN_ROUTE', undefined, 'accion-2');

      expect(prisma.courierActionReceipt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'accion-2', courierId: 'u1', action: 'STATUS', deliveryId: 'd1' }),
      });
    });

    it('rechaza claves ajenas y mal formadas', async () => {
      prisma.courierActionReceipt.findUnique.mockResolvedValue({
        id: 'accion-3',
        courierId: 'otro',
        response: {},
      });
      await expect(service.deliver('u1', 'd1', { idempotencyKey: 'accion-3' })).rejects.toThrow('otro repartidor');

      await expect(service.deliver('u1', 'd1', { idempotencyKey: 'con espacio' })).rejects.toThrow('inválida');
    });

    it('no ejecuta un cobro duplicado aunque el recibo ya exista', async () => {
      prisma.courierActionReceipt.findUnique.mockResolvedValue({
        id: 'accion-4',
        courierId: 'u1',
        action: 'DELIVER',
        response: { id: 'd1', estado: 'DELIVERED', cobro: { monto: 25000, metodo: 'EFECTIVO' } },
      });

      const result = await service.deliver('u1', 'd1', { idempotencyKey: 'accion-4', amount: 25000 });

      expect(result.idempotente).toBe(true);
      expect(prisma.deliveryCollection.create).not.toHaveBeenCalled();
      expect(deliveryService.updateStatus).not.toHaveBeenCalled();
    });
  });
});
