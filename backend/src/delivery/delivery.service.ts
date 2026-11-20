import { Injectable, BadRequestException, NotFoundException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { DeliveryStatus, DeliveryType, OrderStatus, MovementType, Prisma, Role } from '@prisma/client';
import { NotificationService } from './notification.service';
import { TodoistService } from '../todoist/todoist.service';
import { PushService } from '../push/push.service';
import { LogisticsService } from '../logistics/logistics.service';
import { chileDayRange, chileWeekRange, todayChileISO } from '../common/date-range';
import { ESTADOS_PENDIENTES } from './delivery-rules';
import {
  DELIVERY_ORDER_BY,
  DeliveryScope,
  buildDeliveryWhere,
  resolveDeliverySchedule,
  resolvePagination,
} from './delivery-filters';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  // Anti fuerza-bruta del código de 4 dígitos (9000 combos): máximo
  // 8 intentos por entrega cada 10 minutos. En memoria como el login.
  private readonly codeAttempts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private todoist: TodoistService,
    private push: PushService,
    @Optional() private logistics?: LogisticsService,
  ) {}

  async findAll(query: any = {}) {
    const where = buildDeliveryWhere(query as DeliveryScope);

    const include = {
      order: { select: { id: true, orderNumber: true, total: true, customerName: true, customerPhone: true, paymentMethod: true, paymentStatus: true } },
      customer: { select: { id: true, name: true, phone: true } },
      station: { select: { id: true, name: true, line: true, lineName: true, commune: true, latitude: true, longitude: true, defaultMeetingPoint: true } },
    };

    const { page, limit } = resolvePagination(query);
    const paginado = page > 0;

    const [data, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        include,
        orderBy: DELIVERY_ORDER_BY,
        ...(paginado ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return paginado ? { data, total, page, limit } : data;
  }

  /**
   * Contadores de logística. Cada número sale de la MISMA definición de día y de
   * la MISMA lista de estados que la tabla (`buildDeliveryWhere`).
   *
   * - Hoy:        entregas de hoy, sin canceladas ni reprogramadas.
   * - Pendientes: de hoy, sin estado final.
   * - Entregados: de hoy, DELIVERED.
   * - Vencidos:   días anteriores sin estado final (nunca se suman a Pendientes).
   * - Semana:     lunes a domingo de la semana Chile.
   */
  async getCounters() {
    const hoy = todayChileISO();
    const semana = chileWeekRange(hoy);

    // Todos los `where` salen del MISMO constructor que usa la tabla.
    const hoyWhere = buildDeliveryWhere({ day: hoy });
    const semanaWhere = buildDeliveryWhere({ from: semana.from, to: semana.to });
    const vencidosWhere = buildDeliveryWhere({ vencidos: true });
    const despachoWhere = buildDeliveryWhere({ day: hoy, pendientes: true, sinAsignar: true });
    const cargaWhere = buildDeliveryWhere({ day: hoy, pendientes: true });

    const [hoyPorEstado, semanaPorEstado, vencidos, sinAsignar, cargaPorRepartidor, entregadasSemana] =
      await Promise.all([
        this.prisma.delivery.groupBy({
          by: ['status'],
          where: hoyWhere,
          _count: { id: true },
        }),
        this.prisma.delivery.groupBy({
          by: ['status'],
          where: semanaWhere,
          _count: { id: true },
        }),
        this.prisma.delivery.count({ where: vencidosWhere }),
        this.prisma.delivery.count({ where: despachoWhere }),
        this.prisma.delivery.groupBy({
          by: ['assignedTo'],
          where: cargaWhere,
          _count: { id: true },
        }),
        // Puntualidad: se comparan horas locales Chile contra la ventana del
        // mismo día (windowEnd es "HH:MM", no un instante UTC).
        this.prisma.delivery.findMany({
          where: { ...semanaWhere, status: DeliveryStatus.DELIVERED },
          select: { deliveredAt: true, windowEnd: true },
        }),
      ]);

    const repartidores = await this.prisma.user.findMany({
      where: { role: Role.DELIVERY, isActive: true },
      select: { id: true, name: true },
    });
    const nombres = new Map(repartidores.map((u) => [u.id, u.name]));
    const porRepartidor = (cargaPorRepartidor || [])
      .filter((row) => !!row.assignedTo)
      .map((row) => ({
        id: row.assignedTo as string,
        nombre: nombres.get(row.assignedTo as string) || 'Repartidor',
        pendientes: row._count.id,
      }))
      .sort((a, b) => b.pendientes - a.pendientes);

    const porEstado: Record<string, number> = {};
    hoyPorEstado.forEach((s) => { porEstado[s.status] = s._count.id; });

    const sumaSemana = semanaPorEstado.reduce((acc, s) => acc + s._count.id, 0);
    const entregadosSemana = semanaPorEstado
      .filter((s) => s.status === DeliveryStatus.DELIVERED)
      .reduce((acc, s) => acc + s._count.id, 0);
    const pendientesSemana = ESTADOS_PENDIENTES.reduce(
      (acc, s) => acc + (semanaPorEstado.find((x) => x.status === s)?._count.id || 0),
      0,
    );
    const cerradasSemana = sumaSemana - pendientesSemana;

    const conVentana = (entregadasSemana || []).filter((d) => d.deliveredAt && d.windowEnd);
    const aTiempo = conVentana.length
      ? Math.round(
          (conVentana.filter((d) => this.horaChile(d.deliveredAt as Date) <= (d.windowEnd as string)).length /
            conVentana.length) * 100,
        )
      : null;

    const pendientesHoy = ESTADOS_PENDIENTES.reduce((acc, s) => acc + (porEstado[s] || 0), 0);
    const entregadosHoy = porEstado[DeliveryStatus.DELIVERED] || 0;
    const totalHoy = Object.values(porEstado).reduce((a, b) => a + b, 0);

    return {
      hoy: {
        dia: hoy,
        total: totalHoy,
        pendientes: pendientesHoy,
        entregados: entregadosHoy,
        // Cerradas sin entrega: no llegó, incidente, cliente no disponible.
        noEntregados: totalHoy - pendientesHoy - entregadosHoy,
      },
      semana: { desde: semana.from, hasta: semana.to, total: sumaSemana, entregados: entregadosSemana },
      vencidos,
      porEstado,
      // KPIs del panel: misma definición de "cerrada" y de "pendiente".
      kpis: {
        cumplimiento: cerradasSemana > 0 ? Math.round((entregadosSemana / cerradasSemana) * 100) : null,
        aTiempo,
        vencidos,
        sinAsignar,
      },
      despacho: { sinAsignar, porRepartidor },
    };
  }

  /** Hora de Santiago en formato "HH:MM" para comparar con una ventana de entrega. */
  private horaChile(value: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(value);
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
    // Idempotente: el backend auto-crea el delivery al crear la orden METRO y el
    // POS lo crea manual justo después — gana el primero, el otro reutiliza.
    // (Antes lanzaba 400 y el vendedor veía "error al agendar" aunque existía.)
    const existing = await this.prisma.delivery.findUnique({
      where: { orderId: data.orderId },
      include: { station: true, order: true },
    });
    if (existing) return existing;

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

    const deliveryCode = crypto.randomInt(1000, 9999).toString();

    // Único lugar donde la fecha de entrega se convierte a UTC.
    const schedule = resolveDeliverySchedule(data.deliveryDate);

    const delivery = await this.prisma.delivery
      .create({
        data: {
          orderId: data.orderId,
          customerId: data.customerId,
          deliveryType: data.deliveryType,
          stationId: data.stationId || null,
          address: data.address || null,
          deliveryDay: schedule.deliveryDay,
          deliveryDate: schedule.deliveryDate,
          windowStart: data.windowStart || null,
          windowEnd: data.windowEnd || null,
          meetingPoint: data.meetingPoint || null,
          notes: data.notes || null,
          assignedTo: data.assignedTo || null,
          deliveryCode,
          status: DeliveryStatus.CREATED,
        },
        include: { station: true, order: true },
      })
      .catch(async (e: any) => {
        // Carrera con autoCreateDelivery(): el findUnique de arriba pasó, pero
        // otra petición creó la entrega en el intertanto. Devolvemos la que ganó
        // en vez de un 500 al vendedor (P2002 en deliveries.orderId).
        if (e?.code === 'P2002') {
          const concurrent = await this.prisma.delivery.findUnique({
            where: { orderId: data.orderId },
            include: { station: true, order: true },
          });
          if (concurrent) {
            this.logger.warn(
              `Entrega ya creada por otra petición (orden ${data.orderId}); se reutiliza`,
            );
            return concurrent;
          }
        }
        throw e;
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
      deliveryType: delivery.deliveryType,
      address: delivery.address,
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

  /**
   * Transiciones permitidas al repartidor.
   *
   * El flujo administrativo tiene 9 saltos; el repartidor entra en un pedido ya
   * preparado y debe poder hacer En ruta → Entregado en dos toques. No puede
   * cancelar, ni volver a estados de preparación, ni cerrar entregas ajenas
   * (esa validación vive en CourierService).
   */
  private static readonly COURIER_TRANSITIONS: Record<string, DeliveryStatus[]> = Object.fromEntries(
    [
      ...['CREATED', 'PAYMENT_CONFIRMED', 'PREPARING', 'READY', 'SCHEDULED', 'CONFIRMATION_PENDING', 'CONFIRMED'].map(
        (state) => [state, ['IN_ROUTE']],
      ),
      ['IN_ROUTE', ['ARRIVED', 'DELIVERED', 'NOT_DELIVERED', 'CUSTOMER_UNAVAILABLE', 'INCIDENT']],
      ['ARRIVED', ['DELIVERED', 'NOT_DELIVERED', 'CUSTOMER_UNAVAILABLE', 'INCIDENT']],
    ],
  ) as Record<string, DeliveryStatus[]>;

  async updateStatus(
    id: string,
    status: DeliveryStatus,
    userId?: string,
    opts: { courier?: boolean; reason?: string } = {},
  ) {
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

    const allowed = opts.courier
      ? DeliveryService.COURIER_TRANSITIONS[delivery.status] || []
      : validTransitions[delivery.status] || [];

    if (!allowed.includes(status)) {
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

    // Motivo obligatorio cuando se cierra sin entregar (lo valida CourierService).
    if (status === DeliveryStatus.DELIVERED) updateData.failureReason = null;
    else if (opts.reason) updateData.failureReason = String(opts.reason).trim().slice(0, 500);

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: updateData,
      include: { station: true, order: true },
    });

    await this.audit(id, 'STATUS_CHANGED', { status: delivery.status }, { status }, userId);

    // Send WhatsApp notification to customer
    if (updated.order?.customerPhone) {
      const notifData = {
        deliveryId: updated.id,
        orderNumber: updated.order?.orderNumber,
        customerName: updated.order?.customerName,
        customerPhone: updated.order?.customerPhone,
        stationName: updated.station?.name,
        lineName: updated.station?.lineName,
        deliveryType: updated.deliveryType,
        address: updated.address,
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

    // Snapshot financiero (solo DELIVERED genera obligación de pago). Es
    // opcional para no romper pruebas/instancias sin el módulo logístico.
    if (this.logistics) {
      this.logistics.onDeliveryStatusChanged(updated.id).catch((e) =>
        this.logger.warn(`Rentabilidad logística: ${e?.message || e}`),
      );
    }

    return updated;
  }

  async assign(id: string, userId: string, actorId?: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: { assignedTo: userId },
      include: { station: true, order: { select: { orderNumber: true } } },
    });

    await this.audit(id, 'ASSIGNED', { assignedTo: delivery.assignedTo }, { assignedTo: userId }, actorId);

    // Aviso a la PWA del repartidor. Es best-effort: VAPID sin configurar o un
    // dispositivo muerto nunca debe impedir la asignación ya escrita en BD.
    if (userId && userId !== delivery.assignedTo) {
      const destino = (updated as any).station?.name || (updated as any).address || '';
      const detalle = [
        (updated as any).order?.orderNumber,
        destino ? `Metro ${destino}` : '',
        (updated as any).windowStart,
      ].filter(Boolean).join(' · ');
      this.push.sendToUser(userId, {
        title: '🚇 Nueva entrega asignada',
        body: detalle || 'Revisa tu ruta en la app de reparto.',
        url: '/reparto',
      }).then((result) => {
        this.logger.log(`Push de asignación: ${result?.sent || 0}/${result?.total || 0} dispositivos`);
      }).catch((e: any) => {
        this.logger.warn(`Push de asignación omitido: ${e?.message || e}`);
      });
    }

    return updated;
  }

  private async autoCompleteOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;
    // PAID: la venta ya existe y el stock ya se descontó al pagar; solo falta
    // marcar la orden como entregada. AGENDADO se deja intacto (su venta nace
    // el día de la entrega, no al marcarla).
    if (!([OrderStatus.READY, OrderStatus.PREPARING, OrderStatus.PAID] as OrderStatus[]).includes(order.status)) return;
    const alreadyPaid = order.paymentStatus === 'CONFIRMED';

    const writes: Prisma.PrismaPromise<any>[] = [];

    // Mark order as COMPLETED
    writes.push(
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DELIVERED, updatedAt: new Date() },
      }),
    );

    // Create SALE movements: decrease physicalStock and release reservedStock
    // Only deduct stock if not already paid (avoid double deduction)
    if (!alreadyPaid) {
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
    } else {
      // Already paid — only release reserved stock
      for (const item of order.items) {
        if (!item.variantId) continue;
        writes.push(
          this.prisma.$executeRaw`
            UPDATE "product_variants"
            SET "reservedStock" = GREATEST("reservedStock" - ${item.quantity}, 0)
            WHERE "id" = ${item.variantId}
          `,
        );
      }
    }

    await this.prisma.$transaction(writes);

    // Log inventory movements post-transaction
    // ONLY create SALE movement if stock was actually deducted (alreadyPaid=false).
    // When alreadyPaid=true, the SALE movement was already created at payment time
    // (by confirmPayment or updateStatus PAID), so we skip to avoid duplicates.
    if (!alreadyPaid) {
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

    // Mismo helper que create(): el día se guarda como calendario Chile y el
    // instante solo como inicio del día (para notificaciones y Todoist).
    const schedule = resolveDeliverySchedule(data.deliveryDate);

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        deliveryDay: schedule.deliveryDay,
        deliveryDate: schedule.deliveryDate,
        windowStart: data.windowStart,
        windowEnd: data.windowEnd,
        stationId: data.stationId || delivery.stationId,
        meetingPoint: data.meetingPoint || delivery.meetingPoint,
        // La entrega sigue activa en su nueva fecha. `RESCHEDULED` la sacaría de
        // la ruta y los contadores; el reagendamiento queda en la auditoría.
        status: DeliveryStatus.SCHEDULED,
      },
      include: { station: true },
    });

    // La orden es la que muestra la fecha en el resto del panel: mantenerlas
    // alineadas para que no existan dos fechas distintas del mismo pedido.
    try {
      await this.prisma.order.update({
        where: { id: delivery.orderId },
        data: {
          deliveryDay: schedule.deliveryDay ?? undefined,
          deliveryTime: data.windowStart || undefined,
        },
      });
    } catch {
      // La orden puede no existir en escenarios legacy: no bloquea el cambio.
    }

    await this.audit(id, 'RESCHEDULED', {
      deliveryDay: delivery.deliveryDay,
      windowStart: delivery.windowStart,
      windowEnd: delivery.windowEnd,
    }, {
      deliveryDay: schedule.deliveryDay,
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
    const clean = String(code || '').replace(/\D/g, '').slice(0, 4);
    if (clean.length !== 4) {
      throw new BadRequestException('Código inválido');
    }
    const now = Date.now();
    const entry = this.codeAttempts.get(id);
    if (entry && entry.resetAt > now) {
      entry.count += 1;
      if (entry.count > 8) {
        throw new BadRequestException('Demasiados intentos. Espera 10 minutos.');
      }
    } else {
      this.codeAttempts.set(id, { count: 1, resetAt: now + 10 * 60 * 1000 });
      if (this.codeAttempts.size > 5000) {
        const first = this.codeAttempts.keys().next();
        if (!first.done) this.codeAttempts.delete(first.value);
      }
    }

    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');

    if (delivery.deliveryCode !== clean) {
      throw new BadRequestException('Código de entrega incorrecto');
    }
    this.codeAttempts.delete(id);

    return this.updateStatus(id, DeliveryStatus.DELIVERED);
  }

  /**
   * Estadísticas por rango. Usa `deliveryDay` (calendario Chile), igual que
   * `findAll` y `getCounters`: ya no hay aritmética de zonas horarias.
   * Se mantiene por compatibilidad; la pantalla de logística usa `getCounters`.
   */
  async getStats() {
    const hoy = todayChileISO();
    const semana = chileWeekRange(hoy);
    const mes = `${hoy.slice(0, 7)}-01`;
    const visiblesHoy = buildDeliveryWhere({ day: hoy });
    const visiblesSemana = buildDeliveryWhere({ from: semana.from, to: semana.to });
    const visiblesMes = buildDeliveryWhere({ from: mes });

    const [todayDeliveries, weekDeliveries, monthDeliveries, statusCounts, stationCounts] =
      await Promise.all([
        this.prisma.delivery.count({ where: visiblesHoy }),
        this.prisma.delivery.count({ where: visiblesSemana }),
        this.prisma.delivery.count({ where: visiblesMes }),
        this.prisma.delivery.groupBy({
          by: ['status'],
          where: visiblesMes,
          _count: { id: true },
        }),
        this.prisma.delivery.groupBy({
          by: ['stationId'],
          where: visiblesMes,
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
    const startTime = (settings.delivery_start_time as string) || '08:00';
    const endTime = (settings.delivery_end_time as string) || '22:00';
    const interval = (settings.slot_interval_minutes as number) || 30;
    const maxPerSlot = (settings.maximum_orders_per_slot as number) || 10;

    const day = resolveDeliverySchedule(date).deliveryDay;
    if (!day) throw new BadRequestException('Fecha de entrega requerida');

    const existingDeliveries = await this.prisma.delivery.findMany({
      where: {
        deliveryDay: day,
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

    const day = resolveDeliverySchedule(date).deliveryDay;
    if (!day) throw new BadRequestException('Fecha de entrega requerida');

    const count = await this.prisma.delivery.count({
      where: {
        deliveryDay: day,
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

  // Recordatorios push pre-entrega (lo llama un cron externo cada 15 min).
  // Avisa las entregas de HOY cuya hora de inicio cae dentro de los próximos
  // `minutes` (default 60, configurable). Idempotente por día vía auditoría:
  // cada delivery recibe máximo 1 recordatorio diario.
  async dispatchReminders(minutes = 60) {
    const mins = Math.min(240, Math.max(5, Math.round(Number(minutes) || 60)));
    const hoy = todayChileISO();
    // `gte` solo se usa para acotar la auditoría del recordatorio al día Chile.
    const { gte } = chileDayRange(hoy);
    const openStates = [
      DeliveryStatus.CREATED,
      DeliveryStatus.PAYMENT_CONFIRMED,
      DeliveryStatus.PREPARING,
      DeliveryStatus.READY,
      DeliveryStatus.SCHEDULED,
      DeliveryStatus.CONFIRMATION_PENDING,
      DeliveryStatus.CONFIRMED,
    ];
    const dels = await this.prisma.delivery.findMany({
      where: { deliveryDay: hoy, status: { in: openStates } },
      include: {
        order: { select: { orderNumber: true, customerName: true } },
        station: { select: { name: true } },
      },
    });

    // Reloj de Chile (windowStart es hora local "HH:mm")
    const nowParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date());
    const [nh, nm] = nowParts.split(':').map(Number);
    const nowMin = nh * 60 + nm;

    let reminded = 0;
    let skipped = 0;
    for (const d of dels) {
      const m = /^(\d{1,2}):(\d{2})/.exec(String((d as any).windowStart || ''));
      if (!m) {
        skipped++;
        continue;
      }
      const diff = Number(m[1]) * 60 + Number(m[2]) - nowMin;
      if (diff < 0 || diff > mins) {
        skipped++;
        continue;
      }
      const already = await this.prisma.deliveryAuditLog.findFirst({
        where: { deliveryId: d.id, action: 'REMINDER_SENT', createdAt: { gte } },
      });
      if (already) {
        skipped++;
        continue;
      }
      const label = `${(d as any).order?.orderNumber || ''} · ${(d as any).order?.customerName || ''}`.trim();
      const isDomicilio = (d as any).deliveryType === 'ENVIO_DOMICILIO';
      const destino = isDomicilio
        ? (d as any).address || 'Domicilio'
        : `Metro ${(d as any).station?.name || ''}`;
      try {
        const envio = await this.push.broadcast({
          title: `${isDomicilio ? '🏠' : '🚇'} Entrega en ${Math.max(0, diff)} min`,
          body: `${label} — ${destino} ${(d as any).windowStart || ''}`.trim(),
          url: '/admin',
        });
        // Sin destinatarios (push sin configurar, dispositivos desactivados) no
        // se marca como avisado: se reintenta en la siguiente pasada del cron.
        if (!envio || envio.sent === 0) {
          this.logger.warn(`Recordatorio sin destinatarios: entrega ${d.id}; se reintentará`);
          skipped++;
          continue;
        }
      } catch (e: any) {
        // Un fallo de push no debe abortar el lote: antes una sola excepción
        // cortaba los recordatorios restantes y el cron recibía 500.
        this.logger.warn(`Recordatorio push falló: entrega ${d.id}: ${e?.message || e}`);
        skipped++;
        continue;
      }
      await this.audit(d.id, 'REMINDER_SENT', null, { minutesBefore: diff });
      reminded++;
    }
    return { total: dels.length, reminded, skipped, minutes: mins };
  }
}
