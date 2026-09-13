import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryStatus, DeliveryType, OrderStatus, MovementType, Prisma } from '@prisma/client';
import { NotificationService } from './notification.service';
import { TodoistService } from '../todoist/todoist.service';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private todoist: TodoistService,
  ) {}

  async findAll(query: any = {}) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.deliveryType) {
      where.deliveryType = query.deliveryType;
    }
    if (query.stationId) {
      where.stationId = query.stationId;
    }
    if (query.assignedTo) {
      where.assignedTo = query.assignedTo;
    }
    if (query.dateFrom || query.dateTo) {
      where.deliveryDate = {};
      if (query.dateFrom) where.deliveryDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.deliveryDate.lte = new Date(query.dateTo);
    }
    if (query.line) {
      where.station = { line: query.line };
    }
    if (query.commune) {
      where.station = { commune: query.commune };
    }

    const include = {
      order: { select: { id: true, orderNumber: true, total: true, customerName: true, customerPhone: true } },
      customer: { select: { id: true, name: true, phone: true } },
      station: { select: { id: true, name: true, line: true, lineName: true, commune: true, latitude: true, longitude: true, defaultMeetingPoint: true } },
    };

    const page = Math.max(1, parseInt(query.page, 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));

    if (page > 0) {
      const [data, total] = await Promise.all([
        this.prisma.delivery.findMany({ where, include, orderBy: { deliveryDate: 'asc' }, skip: (page - 1) * limit, take: limit }),
        this.prisma.delivery.count({ where }),
      ]);
      return { data, total, page, limit };
    }

    return this.prisma.delivery.findMany({ where, include, orderBy: { deliveryDate: 'asc' } });
  }

  async findOne(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        order: { include: { items: true } },
        customer: true,
        station: true,
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');
    return delivery;
  }

  async findByOrder(orderId: string) {
    return this.prisma.delivery.findUnique({
      where: { orderId },
      include: { station: true, customer: true },
    });
  }

  async create(data: {
    orderId: string;
    customerId: string;
    deliveryType: DeliveryType;
    stationId?: string;
    address?: string;
    deliveryDate?: string;
    windowStart?: string;
    windowEnd?: string;
    meetingPoint?: string;
    notes?: string;
    assignedTo?: string;
  }) {
    const existing = await this.prisma.delivery.findUnique({ where: { orderId: data.orderId } });
    if (existing) throw new BadRequestException('Ya existe una entrega para este pedido');

    if (data.deliveryType === 'METRO' && data.stationId) {
      const station = await this.prisma.metroStation.findUnique({ where: { id: data.stationId } });
      if (!station || !station.active || !station.deliveryEnabled) {
        throw new BadRequestException('Estación no disponible para entregas');
      }
    }

    if (data.windowStart && data.windowEnd && data.deliveryDate) {
      const slotAvailable = await this.checkSlotAvailability(
        data.deliveryDate,
        data.windowStart,
        data.windowEnd,
        data.stationId,
      );
      if (!slotAvailable) {
        throw new BadRequestException('El horario seleccionado ya está completo');
      }
    }

    const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();

    const delivery = await this.prisma.delivery.create({
      data: {
        orderId: data.orderId,
        customerId: data.customerId,
        deliveryType: data.deliveryType,
        stationId: data.stationId || null,
        address: data.address || null,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        windowStart: data.windowStart || null,
        windowEnd: data.windowEnd || null,
        meetingPoint: data.meetingPoint || null,
        notes: data.notes || null,
        assignedTo: data.assignedTo || null,
        deliveryCode,
        status: DeliveryStatus.CREATED,
      },
      include: { station: true, order: true },
    });

    await this.audit(delivery.id, 'CREATED', null, { deliveryType: data.deliveryType, stationId: data.stationId });

    // Create Todoist task if configured
    let calendarEventId: string | null = null;
    if (!this.todoist.isReady()) {
      this.logger.warn(`Todoist omitido entrega ${delivery.id}: no listo`);
    } else if (!delivery.station) {
      this.logger.warn(`Todoist omitido entrega ${delivery.id}: sin estación`);
    } else if (!delivery.deliveryDate) {
      this.logger.warn(`Todoist omitido entrega ${delivery.id}: sin fecha`);
    } else {
      calendarEventId = await this.todoist.createDeliveryTask({
        id: delivery.id,
        orderNumber: delivery.order?.orderNumber,
        customerName: delivery.order?.customerName,
        stationName: delivery.station.name,
        lineName: delivery.station.lineName,
        deliveryDate: delivery.deliveryDate,
        windowStart: delivery.windowStart,
        windowEnd: delivery.windowEnd,
        meetingPoint: delivery.meetingPoint,
        commune: delivery.station.commune,
        latitude: delivery.station.latitude,
        longitude: delivery.station.longitude,
      });

      if (calendarEventId) {
        await this.prisma.delivery.update({
          where: { id: delivery.id },
          data: { calendarEventId },
        });
      }
    }

    // Build notification data for customer
    const notifData = {
      deliveryId: delivery.id,
      orderNumber: delivery.order?.orderNumber,
      customerName: delivery.order?.customerName,
      customerPhone: delivery.order?.customerPhone,
      stationName: delivery.station?.name,
      lineName: delivery.station?.lineName,
      deliveryDate: delivery.deliveryDate,
      windowStart: delivery.windowStart,
      windowEnd: delivery.windowEnd,
      meetingPoint: delivery.meetingPoint,
      deliveryCode,
      commune: delivery.station?.commune,
    };
    const notifMessage = this.notificationService.buildDeliveryStatusMessage(delivery.status, notifData);
    const whatsappUrl = notifData.customerPhone && notifMessage
      ? this.notificationService.getWhatsAppUrl(notifData.customerPhone, notifMessage)
      : null;

    return { ...delivery, calendarEventId, whatsappUrl };
  }

  async updateStatus(id: string, status: DeliveryStatus, userId?: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');

    const validTransitions: Record<string, string[]> = {
      CREATED: ['PAYMENT_CONFIRMED', 'CANCELLED'],
      PAYMENT_CONFIRMED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['SCHEDULED', 'CANCELLED'],
      SCHEDULED: ['CONFIRMATION_PENDING', 'CANCELLED', 'RESCHEDULED'],
      CONFIRMATION_PENDING: ['CONFIRMED', 'CUSTOMER_UNAVAILABLE', 'CANCELLED'],
      CONFIRMED: ['IN_ROUTE', 'CANCELLED', 'RESCHEDULED'],
      IN_ROUTE: ['ARRIVED', 'INCIDENT', 'CUSTOMER_UNAVAILABLE'],
      ARRIVED: ['DELIVERED', 'CUSTOMER_UNAVAILABLE', 'NOT_DELIVERED', 'INCIDENT'],
      DELIVERED: [],
      CANCELLED: [],
      RESCHEDULED: ['SCHEDULED'],
      CUSTOMER_UNAVAILABLE: ['RESCHEDULED', 'CANCELLED'],
      NOT_DELIVERED: ['RESCHEDULED', 'CANCELLED'],
      INCIDENT: ['RESCHEDULED', 'CANCELLED'],
    };

    if (!validTransitions[delivery.status]?.includes(status)) {
      throw new BadRequestException(
        `No se puede cambiar de ${delivery.status} a ${status}`,
      );
    }

    const now = new Date();
    const updateData: any = { status };

    if (status === 'CONFIRMATION_PENDING') updateData.confirmedAt = now;
    if (status === 'IN_ROUTE') updateData.startedAt = now;
    if (status === 'ARRIVED') updateData.arrivedAt = now;
    if (status === 'DELIVERED') updateData.deliveredAt = now;

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: updateData,
      include: { station: true, order: true },
    });

    await this.audit(id, 'STATUS_CHANGED', { status: delivery.status }, { status });

    // Send WhatsApp notification to customer
    if (updated.order?.customerPhone) {
      const notifData = {
        deliveryId: updated.id,
        orderNumber: updated.order?.orderNumber,
        customerName: updated.order?.customerName,
        customerPhone: updated.order?.customerPhone,
        stationName: updated.station?.name,
        lineName: updated.station?.lineName,
        deliveryDate: updated.deliveryDate,
        windowStart: updated.windowStart,
        windowEnd: updated.windowEnd,
        meetingPoint: updated.meetingPoint,
        deliveryCode: updated.deliveryCode,
        commune: updated.station?.commune,
      };

      const message = this.notificationService.buildDeliveryStatusMessage(status, notifData);
      if (message) {
        this.notificationService.logNotification(status, id, 'whatsapp');
      }
    }

    // Update Todoist task on status change
    if (updated.calendarEventId && this.todoist.isReady()) {
      const STATUS_LABELS: Record<string, string> = {
        PAYMENT_CONFIRMED: '💰 Pago confirmado',
        PREPARING: '📦 En preparación',
        READY: '✅ Listo',
        SCHEDULED: '📅 Agendada',
        CONFIRMED: '✔️ Confirmada',
        IN_ROUTE: '🚚 En camino',
        ARRIVED: '📍 Llegó',
        DELIVERED: '🎉 Entregada',
        CANCELLED: '❌ Cancelada',
        RESCHEDULED: '🔄 Reagendada',
      };

      const label = STATUS_LABELS[status] || status;
      const eventTitle = `Entrega #${updated.order?.orderNumber || id.slice(0, 8)} — ${label}`;

      await this.todoist.updateDeliveryTask(updated.calendarEventId, {
        summary: eventTitle,
      });
    }

    // Close todoist task if delivered, delete if cancelled
    if (status === DeliveryStatus.DELIVERED && updated.calendarEventId && this.todoist.isReady()) {
      await this.todoist.closeDeliveryTask(updated.calendarEventId);
    }
    if (status === DeliveryStatus.CANCELLED && updated.calendarEventId && this.todoist.isReady()) {
      await this.todoist.deleteDeliveryTask(updated.calendarEventId);
    }

    // Auto-complete order when delivery is DELIVERED
    if (status === DeliveryStatus.DELIVERED && updated.orderId) {
      this.autoCompleteOrder(updated.orderId).catch((e) =>
        this.logger.warn(`No se pudo auto-completar orden ${updated.order?.orderNumber}: ${e?.message}`),
      );
    }

    return updated;
  }

  async assign(id: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: { assignedTo: userId },
      include: { station: true },
    });

    await this.audit(id, 'ASSIGNED', { assignedTo: delivery.assignedTo }, { assignedTo: userId });
    return updated;
  }

  private async autoCompleteOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;
    if (order.status !== OrderStatus.READY && order.status !== OrderStatus.PREPARING) return;

    const writes: Prisma.PrismaPromise<any>[] = [];

    // Mark order as COMPLETED
    writes.push(
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DELIVERED, updatedAt: new Date() },
      }),
    );

    // Create SALE movements: decrease physicalStock and release reservedStock
    for (const item of order.items) {
      if (!item.variantId) continue;
      writes.push(
        this.prisma.$executeRaw`
          UPDATE "product_variants"
          SET "physicalStock" = GREATEST("physicalStock" - ${item.quantity}, 0),
              "reservedStock" = GREATEST("reservedStock" - ${item.quantity}, 0)
          WHERE "id" = ${item.variantId}
        `,
      );
    }

    await this.prisma.$transaction(writes);

    // Log inventory movements post-transaction
    for (const item of order.items) {
      if (!item.variantId) continue;
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: item.variantId },
        select: { physicalStock: true },
      });
      const newStock = variant?.physicalStock ?? 0;
      await this.prisma.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          type: MovementType.SALE,
          quantity: -item.quantity,
          previousStock: newStock + item.quantity,
          newStock,
          orderId,
          notes: `Venta completada ${order.orderNumber}`,
        },
      });
    }

    this.logger.log(`Orden ${order.orderNumber} auto-completada por entrega DELIVERED`);
  }

  async reschedule(id: string, data: { deliveryDate: string; windowStart: string; windowEnd: string; stationId?: string; meetingPoint?: string }) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');

    if (data.windowStart && data.windowEnd && data.deliveryDate) {
      const slotAvailable = await this.checkSlotAvailability(
        data.deliveryDate,
        data.windowStart,
        data.windowEnd,
        data.stationId || delivery.stationId,
        id,
      );
      if (!slotAvailable) {
        throw new BadRequestException('El nuevo horario ya está completo');
      }
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        deliveryDate: new Date(data.deliveryDate),
        windowStart: data.windowStart,
        windowEnd: data.windowEnd,
        stationId: data.stationId || delivery.stationId,
        meetingPoint: data.meetingPoint || delivery.meetingPoint,
        status: DeliveryStatus.RESCHEDULED,
      },
      include: { station: true },
    });

    await this.audit(id, 'RESCHEDULED', {
      deliveryDate: delivery.deliveryDate,
      windowStart: delivery.windowStart,
      windowEnd: delivery.windowEnd,
    }, {
      deliveryDate: data.deliveryDate,
      windowStart: data.windowStart,
      windowEnd: data.windowEnd,
    });

    // Update Todoist task
    if (updated.calendarEventId && this.todoist.isReady()) {
      await this.todoist.updateDeliveryTask(updated.calendarEventId, {
        summary: `Entrega #${id.slice(0, 8)} — 🔄 Reagendada`,
        deliveryDate: data.deliveryDate,
        windowStart: data.windowStart,
      });
    }

    return updated;
  }

  async verifyCode(id: string, code: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');

    if (delivery.deliveryCode !== code) {
      throw new BadRequestException('Código de entrega incorrecto');
    }

    return this.updateStatus(id, DeliveryStatus.DELIVERED);
  }

  async getStats(query: { dateFrom?: string; dateTo?: string } = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayDeliveries, weekDeliveries, monthDeliveries, statusCounts, stationCounts] =
      await Promise.all([
        this.prisma.delivery.count({
          where: { deliveryDate: { gte: today, lt: tomorrow } },
        }),
        this.prisma.delivery.count({
          where: { deliveryDate: { gte: weekStart, lt: tomorrow } },
        }),
        this.prisma.delivery.count({
          where: { deliveryDate: { gte: monthStart } },
        }),
        this.prisma.delivery.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.prisma.delivery.groupBy({
          by: ['stationId'],
          where: { deliveryDate: { gte: monthStart } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),
      ]);

    const statusMap: Record<string, number> = {};
    statusCounts.forEach((s) => { statusMap[s.status] = s._count.id; });

    // Batch-fetch all stations in one query (fixes N+1)
    const allStationIds = stationCounts.map((s) => s.stationId).filter(Boolean) as string[];
    const stations = allStationIds.length
      ? await this.prisma.metroStation.findMany({ where: { id: { in: allStationIds } } })
      : [];
    const stationMap = new Map(stations.map((s) => [s.id, s]));

    // Top 10 stations
    const topStations = stationCounts.slice(0, 10).map((s) => ({
      station: stationMap.get(s.stationId || ''),
      count: s._count.id,
    }));

    // Aggregate by line from the same data (no second query needed)
    const lineMap: Record<string, { line: string; lineName: string; count: number }> = {};
    stationCounts.forEach((s) => {
      const station = stationMap.get(s.stationId || '');
      const line = station?.line || 'N/A';
      const lineName = station?.lineName || 'N/A';
      if (!lineMap[line]) lineMap[line] = { line, lineName, count: 0 };
      lineMap[line].count += s._count.id;
    });

    return {
      today: todayDeliveries,
      week: weekDeliveries,
      month: monthDeliveries,
      byStatus: statusMap,
      topStations,
      byLine: Object.values(lineMap),
    };
  }

  async getSlots(date: string, stationId?: string) {
    const settings = await this.getSettings();
    const startTime = (settings.delivery_start_time as string) || '10:00';
    const endTime = (settings.delivery_end_time as string) || '21:00';
    const interval = (settings.slot_interval_minutes as number) || 30;
    const maxPerSlot = (settings.maximum_orders_per_slot as number) || 10;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingDeliveries = await this.prisma.delivery.findMany({
      where: {
        deliveryDate: { gte: targetDate, lt: nextDay },
        status: { notIn: [DeliveryStatus.CANCELLED, DeliveryStatus.RESCHEDULED] },
        ...(stationId ? { stationId } : {}),
      },
      select: { windowStart: true, windowEnd: true },
    });

    const slotCounts: Record<string, number> = {};
    existingDeliveries.forEach((d) => {
      if (d.windowStart) {
        slotCounts[d.windowStart] = (slotCounts[d.windowStart] || 0) + 1;
      }
    });

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const slots: { start: string; end: string; available: boolean; count: number; max: number }[] = [];

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + interval <= endMinutes) {
      const h1 = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
      const m1 = (currentMinutes % 60).toString().padStart(2, '0');
      const h2 = Math.floor((currentMinutes + interval) / 60).toString().padStart(2, '0');
      const m2 = ((currentMinutes + interval) % 60).toString().padStart(2, '0');

      const start = `${h1}:${m1}`;
      const count = slotCounts[start] || 0;

      slots.push({
        start,
        end: `${h2}:${m2}`,
        available: count < maxPerSlot,
        count,
        max: maxPerSlot,
      });

      currentMinutes += interval;
    }

    return slots;
  }

  private async checkSlotAvailability(date: string, windowStart: string, windowEnd: string, stationId?: string, excludeId?: string) {
    const settings = await this.getSettings();
    const maxPerSlot = (settings.maximum_orders_per_slot as number) || 10;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const count = await this.prisma.delivery.count({
      where: {
        deliveryDate: { gte: targetDate, lt: nextDay },
        windowStart,
        status: { notIn: [DeliveryStatus.CANCELLED, DeliveryStatus.RESCHEDULED] },
        ...(stationId ? { stationId } : {}),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    return count < maxPerSlot;
  }

  private async getSettings() {
    const all = await this.prisma.deliverySettings.findMany();
    const settings: Record<string, any> = {};
    all.forEach((s) => { settings[s.key] = s.value; });
    return settings;
  }

  private async audit(deliveryId: string, action: string, oldValue: any, newValue: any, userId?: string) {
    await this.prisma.deliveryAuditLog.create({
      data: {
        deliveryId,
        userId: userId || null,
        action,
        oldValue: oldValue || Prisma.JsonNull,
        newValue: newValue || Prisma.JsonNull,
      },
    });
  }
}
