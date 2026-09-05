import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryStatus, DeliveryType } from '@prisma/client';

jest.mock('../google/google-calendar.service', () => ({
  GoogleCalendarService: jest.fn().mockImplementation(() => ({
    isReady: jest.fn().mockReturnValue(false),
    createDeliveryEvent: jest.fn().mockResolvedValue(null),
    updateDeliveryEvent: jest.fn().mockResolvedValue(true),
    deleteDeliveryEvent: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('./notification.service', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    buildDeliveryStatusMessage: jest.fn().mockReturnValue('test message'),
    getWhatsAppUrl: jest.fn().mockReturnValue('https://wa.me/test'),
    logNotification: jest.fn(),
  })),
}));

describe('DeliveryService', () => {
  let service: DeliveryService;
  let prismaMock: any;

  const mockDelivery = {
    id: 'del-1',
    orderId: 'ord-1',
    customerId: 'cust-1',
    deliveryType: DeliveryType.METRO,
    stationId: 'station-1',
    address: null,
    deliveryDate: new Date('2026-09-05'),
    windowStart: '17:00',
    windowEnd: '17:30',
    meetingPoint: 'Acceso principal',
    notes: null,
    status: DeliveryStatus.CREATED,
    deliveryCode: '5832',
    calendarEventId: null,
    routeId: null,
    routeSequence: null,
    assignedTo: null,
    confirmedAt: null,
    startedAt: null,
    arrivedAt: null,
    deliveredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = {
      delivery: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      metroStation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      deliverySettings: {
        findMany: jest.fn(),
      },
      deliveryAuditLog: {
        create: jest.fn(),
      },
    };

    const { NotificationService } = require('./notification.service');
    const { GoogleCalendarService } = require('../google/google-calendar.service');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: PrismaService, useValue: prismaMock },
        NotificationService,
        GoogleCalendarService,
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
  });

  describe('create', () => {
    it('should create a delivery successfully', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(null);
      prismaMock.metroStation.findUnique.mockResolvedValue({ id: 'station-1', active: true, deliveryEnabled: true });
      prismaMock.deliverySettings.findMany.mockResolvedValue([
        { key: 'maximum_orders_per_slot', value: 10 },
      ]);
      prismaMock.delivery.count.mockResolvedValue(3);
      prismaMock.delivery.create.mockResolvedValue(mockDelivery);
      prismaMock.deliveryAuditLog.create.mockResolvedValue({});

      const result = await service.create({
        orderId: 'ord-1',
        customerId: 'cust-1',
        deliveryType: DeliveryType.METRO,
        stationId: 'station-1',
        deliveryDate: '2026-09-05',
        windowStart: '17:00',
        windowEnd: '17:30',
      });

      expect(result.deliveryCode).toBeDefined();
      expect(result.status).toBe(DeliveryStatus.CREATED);
      expect(prismaMock.delivery.create).toHaveBeenCalled();
    });

    it('should reject duplicate delivery for same order', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(mockDelivery);

      await expect(
        service.create({ orderId: 'ord-1', customerId: 'cust-1', deliveryType: DeliveryType.METRO }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject inactive station', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(null);
      prismaMock.metroStation.findUnique.mockResolvedValue({ id: 'station-1', active: false, deliveryEnabled: true });

      await expect(
        service.create({ orderId: 'ord-1', customerId: 'cust-1', deliveryType: DeliveryType.METRO, stationId: 'station-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when slot is full', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(null);
      prismaMock.metroStation.findUnique.mockResolvedValue({ id: 'station-1', active: true, deliveryEnabled: true });
      prismaMock.deliverySettings.findMany.mockResolvedValue([
        { key: 'maximum_orders_per_slot', value: 2 },
      ]);
      prismaMock.delivery.count.mockResolvedValue(2);

      await expect(
        service.create({
          orderId: 'ord-1',
          customerId: 'cust-1',
          deliveryType: DeliveryType.METRO,
          stationId: 'station-1',
          deliveryDate: '2026-09-05',
          windowStart: '17:00',
          windowEnd: '17:30',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should transition CREATED → PAYMENT_CONFIRMED', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({ ...mockDelivery, status: DeliveryStatus.CREATED });
      prismaMock.delivery.update.mockResolvedValue({ ...mockDelivery, status: DeliveryStatus.PAYMENT_CONFIRMED });
      prismaMock.deliveryAuditLog.create.mockResolvedValue({});

      const result = await service.updateStatus('del-1', DeliveryStatus.PAYMENT_CONFIRMED);
      expect(result.status).toBe(DeliveryStatus.PAYMENT_CONFIRMED);
    });

    it('should reject invalid transition CREATED → DELIVERED', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({ ...mockDelivery, status: DeliveryStatus.CREATED });

      await expect(
        service.updateStatus('del-1', DeliveryStatus.DELIVERED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transition on non-existent delivery', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', DeliveryStatus.DELIVERED),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow full flow: CREATED → PAYMENT_CONFIRMED → PREPARING → READY → SCHEDULED → CONFIRMATION_PENDING → CONFIRMED → IN_ROUTE → ARRIVED → DELIVERED', async () => {
      const flow = [
        DeliveryStatus.PAYMENT_CONFIRMED,
        DeliveryStatus.PREPARING,
        DeliveryStatus.READY,
        DeliveryStatus.SCHEDULED,
        DeliveryStatus.CONFIRMATION_PENDING,
        DeliveryStatus.CONFIRMED,
        DeliveryStatus.IN_ROUTE,
        DeliveryStatus.ARRIVED,
        DeliveryStatus.DELIVERED,
      ];

      let currentStatus: DeliveryStatus = DeliveryStatus.CREATED;
      for (const nextStatus of flow) {
        prismaMock.delivery.findUnique.mockResolvedValue({ ...mockDelivery, status: currentStatus });
        prismaMock.delivery.update.mockResolvedValue({ ...mockDelivery, status: nextStatus });
        prismaMock.deliveryAuditLog.create.mockResolvedValue({});

        const result = await service.updateStatus('del-1', nextStatus);
        expect(result.status).toBe(nextStatus);
        currentStatus = nextStatus;
      }
    });
  });

  describe('verifyCode', () => {
    it('should verify correct code', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({ ...mockDelivery, status: DeliveryStatus.ARRIVED, deliveryCode: '5832' });
      prismaMock.delivery.update.mockResolvedValue({ ...mockDelivery, status: DeliveryStatus.DELIVERED });
      prismaMock.deliveryAuditLog.create.mockResolvedValue({});

      const result = await service.verifyCode('del-1', '5832');
      expect(result.status).toBe(DeliveryStatus.DELIVERED);
    });

    it('should reject incorrect code', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({ ...mockDelivery, deliveryCode: '5832' });

      await expect(service.verifyCode('del-1', '9999')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSlots', () => {
    it('should return time slots with availability', async () => {
      prismaMock.deliverySettings.findMany.mockResolvedValue([
        { key: 'delivery_start_time', value: '10:00' },
        { key: 'delivery_end_time', value: '12:00' },
        { key: 'slot_interval_minutes', value: 60 },
        { key: 'maximum_orders_per_slot', value: 5 },
      ]);
      prismaMock.delivery.findMany.mockResolvedValue([
        { windowStart: '10:00' },
        { windowStart: '10:00' },
      ]);

      const slots = await service.getSlots('2026-09-05');

      expect(slots).toHaveLength(2);
      expect(slots[0]).toEqual({ start: '10:00', end: '11:00', available: true, count: 2, max: 5 });
      expect(slots[1]).toEqual({ start: '11:00', end: '12:00', available: true, count: 0, max: 5 });
    });

    it('should mark full slots as unavailable', async () => {
      prismaMock.deliverySettings.findMany.mockResolvedValue([
        { key: 'delivery_start_time', value: '10:00' },
        { key: 'delivery_end_time', value: '12:00' },
        { key: 'slot_interval_minutes', value: 60 },
        { key: 'maximum_orders_per_slot', value: 2 },
      ]);
      prismaMock.delivery.findMany.mockResolvedValue([
        { windowStart: '10:00' },
        { windowStart: '10:00' },
        { windowStart: '10:00' },
      ]);

      const slots = await service.getSlots('2026-09-05');

      expect(slots[0].available).toBe(false);
      expect(slots[0].count).toBe(3);
    });
  });

  describe('getStats', () => {
    it('should return delivery statistics', async () => {
      const today = new Date();
      prismaMock.delivery.count
        .mockResolvedValueOnce(5) // today
        .mockResolvedValueOnce(12) // week
        .mockResolvedValueOnce(30); // month
      prismaMock.delivery.groupBy
        .mockResolvedValueOnce([{ status: DeliveryStatus.CONFIRMED, _count: { id: 3 } }]) // byStatus
        .mockResolvedValueOnce([{ stationId: 's1', _count: { id: 5 } }]) // topStations
        .mockResolvedValueOnce([{ stationId: 's1', _count: { id: 5 } }]); // stationCounts
      prismaMock.metroStation.findMany.mockResolvedValue([{ id: 's1', line: 'L1', lineName: 'Línea 1' }]);
      prismaMock.metroStation.findUnique.mockResolvedValue({ id: 's1', line: 'L1', lineName: 'Línea 1' });

      const stats = await service.getStats();

      expect(stats).toBeDefined();
      expect(stats.today).toBe(5);
      expect(stats.week).toBe(12);
      expect(stats.month).toBe(30);
      expect(stats.byStatus[DeliveryStatus.CONFIRMED]).toBe(3);
      expect(stats.topStations).toHaveLength(1);
    });
  });
});
