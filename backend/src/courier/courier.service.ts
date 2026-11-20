import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CashShiftStatus, DeliveryStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { addDaysISO, todayChileISO } from '../common/date-range';
import { DELIVERY_ORDER_BY } from '../delivery/delivery-filters';
import { ESTADOS_PENDIENTES, ESTADOS_VISIBLES } from '../delivery/delivery-rules';
import { DeliveryService } from '../delivery/delivery.service';

/** Foto máxima aceptada (el cliente comprime antes de subirla). */
const MAX_PHOTO_BYTES = 1_500_000;
const PHOTO_DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i;
const BARE_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Datos que ve el repartidor. Nada de email, RUT, historial de compras,
 * márgenes ni costos: solo lo necesario para entregar y cobrar.
 */
export const COURIER_SELECT = {
  id: true,
  deliveryCode: true,
  deliveryDay: true,
  windowStart: true,
  windowEnd: true,
  status: true,
  deliveryType: true,
  address: true,
  meetingPoint: true,
  notes: true,
  failureReason: true,
  deliveredAt: true,
  station: {
    select: { name: true, line: true, lineName: true, commune: true, latitude: true, longitude: true },
  },
  order: {
    select: { orderNumber: true, total: true, paymentMethod: true, paymentStatus: true, customerName: true },
  },
  customer: { select: { name: true, phone: true } },
} satisfies Prisma.DeliverySelect;

/** Estados que el repartidor puede escribir. */
export const COURIER_TARGETS: DeliveryStatus[] = [
  DeliveryStatus.IN_ROUTE,
  DeliveryStatus.ARRIVED,
  DeliveryStatus.DELIVERED,
  DeliveryStatus.NOT_DELIVERED,
  DeliveryStatus.CUSTOMER_UNAVAILABLE,
  DeliveryStatus.INCIDENT,
];

/** Estados que exigen motivo escrito para cerrarse. */
const REQUIEREN_MOTIVO: DeliveryStatus[] = [
  DeliveryStatus.NOT_DELIVERED,
  DeliveryStatus.CUSTOMER_UNAVAILABLE,
  DeliveryStatus.INCIDENT,
];

export type CourierRoute = {
  dia: string;
  resumen: {
    total: number;
    pendientes: number;
    entregadas: number;
    noEntregadas: number;
  };
  entregas: Array<{
    id: string;
    codigo: string;
    dia: string | null;
    ventana: { inicio: string | null; fin: string | null };
    estado: string;
    estacion: { nombre: string; linea: string | null; lineaNombre: string | null; comuna: string | null } | null;
    direccion: string | null;
    puntoEncuentro: string | null;
    notas: string | null;
    cliente: { nombre: string; telefono: string };
    pedido: { numero: string; total: number };
    cobro: { monto: number; estado: 'PAGADO' | 'POR_COBRAR'; metodo: string | null };
  }>;
};

@Injectable()
export class CourierService {
  constructor(
    private prisma: PrismaService,
    private deliveryService: DeliveryService,
  ) {}

  /** Configuración de la PWA del repartidor. Sin valores de negocio en código. */
  async getConfig() {
    const rows = await this.prisma.deliverySettings.findMany({
      where: { key: { in: ['courier_idle_minutes', 'courier_tomorrow_enabled'] } },
    });
    const settings: Record<string, any> = {};
    rows.forEach((r) => { settings[r.key] = r.value; });
    const idle = Number(settings.courier_idle_minutes);
    return {
      // 15 min es una política de seguridad, no un valor comercial.
      inactividadMinutos: Number.isFinite(idle) && idle > 0 ? Math.min(240, idle) : 15,
      mananaHabilitado: settings.courier_tomorrow_enabled !== false,
    };
  }

  /**
   * Resuelve el día pedido. El repartidor no puede navegar el historial: solo
   * hoy y, si está habilitado, mañana. Pedir otro día es 403.
   */
  async resolveDay(day?: string): Promise<{ dia: string; mananaHabilitado: boolean }> {
    const { mananaHabilitado } = await this.getConfig();
    const hoy = todayChileISO();
    const manana = addDaysISO(hoy, 1);
    const raw = String(day || '').trim().toLowerCase();

    if (!raw || raw === 'hoy' || raw === 'today') return { dia: hoy, mananaHabilitado };
    if (raw === 'manana' || raw === 'mañana' || raw === 'tomorrow') {
      if (!mananaHabilitado) throw new ForbiddenException('Mañana no está habilitado');
      return { dia: manana, mananaHabilitado };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      throw new BadRequestException('Día inválido (usa hoy, manana o YYYY-MM-DD)');
    }
    if (raw !== hoy && raw !== manana) {
      throw new ForbiddenException('Solo puedes ver las entregas de hoy o de mañana');
    }
    if (raw === manana && !mananaHabilitado) {
      throw new ForbiddenException('Mañana no está habilitado');
    }
    return { dia: raw, mananaHabilitado };
  }

  /** Ruta del repartidor autenticado: solo sus entregas, agrupables por estación. */
  async getRoute(userId: string, day?: string): Promise<CourierRoute> {
    const { dia } = await this.resolveDay(day);
    const visibles = ESTADOS_VISIBLES;

    const rows = await this.prisma.delivery.findMany({
      where: { assignedTo: userId, deliveryDay: dia, status: { in: visibles } },
      select: COURIER_SELECT,
      orderBy: DELIVERY_ORDER_BY,
    });

    const entregas = rows.map((d) => this.toCard(d));
    const entregadas = entregas.filter((d) => d.estado === DeliveryStatus.DELIVERED).length;
    const pendientes = entregas.filter((d) => ESTADOS_PENDIENTES.includes(d.estado as DeliveryStatus)).length;

    return {
      dia,
      resumen: {
        total: entregas.length,
        pendientes,
        entregadas,
        noEntregadas: entregas.length - entregadas - pendientes,
      },
      entregas,
    };
  }

  /** Detalle de una entrega propia. Fuera de hoy/mañana es 404 (no se revela). */
  async getDelivery(userId: string, id: string) {
    const { dia } = await this.resolveDay();
    const manana = addDaysISO(dia, 1);
    const delivery = await this.prisma.delivery.findFirst({
      where: {
        id,
        assignedTo: userId,
        deliveryDay: { in: [dia, manana] },
        status: { in: ESTADOS_VISIBLES },
      },
      select: {
        ...COURIER_SELECT,
        order: {
          select: {
            orderNumber: true,
            total: true,
            paymentMethod: true,
            paymentStatus: true,
            customerName: true,
            deliveryDetails: true,
            items: { select: { quantity: true, productName: true } },
          },
        },
        collection: {
          select: { amount: true, method: true, reference: true, collectedAt: true },
        },
        proof: {
          select: { code: true, recipientName: true, photoDataUrl: true, createdAt: true },
        },
      },
    });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');

    const card = this.toCard(delivery);
    const anyDelivery = delivery as any;
    return {
      ...card,
      productos: anyDelivery.order?.items?.map((i: any) => ({
        nombre: i.productName,
        cantidad: i.quantity,
      })) || [],
      notasPedido: anyDelivery.order?.deliveryDetails || null,
      cobroRegistrado: anyDelivery.collection
        ? {
            monto: Number(anyDelivery.collection.amount),
            metodo: anyDelivery.collection.method,
            referencia: anyDelivery.collection.reference,
            cobradoEn: anyDelivery.collection.collectedAt,
          }
        : null,
      evidencia: anyDelivery.proof
        ? {
            codigo: anyDelivery.proof.code,
            receptor: anyDelivery.proof.recipientName,
            conFoto: !!anyDelivery.proof.photoDataUrl,
            registradaEn: anyDelivery.proof.createdAt,
          }
        : null,
    };
  }

  /**
   * Cambia el estado de una entrega propia con las transiciones del repartidor.
   * El motivo es obligatorio cuando la entrega se cierra sin éxito.
   */
  async updateStatus(userId: string, id: string, status: string, reason?: string, idempotencyKey?: string) {
    const key = this.receiptKey(idempotencyKey);
    const replay = await this.replayReceipt(userId, key);
    if (replay) return replay;

    const target = String(status || '').trim().toUpperCase() as DeliveryStatus;
    if (!COURIER_TARGETS.includes(target)) {
      throw new BadRequestException('Estado no permitido para el repartidor');
    }
    if (target === DeliveryStatus.DELIVERED) {
      throw new BadRequestException(
        'Para entregar registra el cobro y la prueba de entrega (POST /courier/route/:id/deliver)',
      );
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      select: { id: true, assignedTo: true, deliveryDay: true, status: true },
    });
    if (!delivery || delivery.assignedTo !== userId) {
      throw new NotFoundException('Entrega no encontrada');
    }

    const motivo = String(reason || '').trim();
    if (REQUIEREN_MOTIVO.includes(target) && motivo.length < 3) {
      throw new BadRequestException('El motivo es obligatorio para cerrar la entrega sin éxito');
    }

    const updated = await this.deliveryService.updateStatus(id, target, userId, {
      courier: true,
      reason: REQUIEREN_MOTIVO.includes(target) ? motivo : undefined,
    });

    const response = {
      id: updated.id,
      estado: updated.status,
      entregadoEn: updated.deliveredAt,
      motivo: updated.failureReason,
    };
    await this.saveReceipt(userId, key, 'STATUS', response, id);
    return response;
  }

  /**
   * Solicitud de reprogramación: no mueve la fecha por sí sola (eso lo decide
   * el admin en el panel). Queda auditada para que no se pierda el aviso.
   */
  async requestReschedule(userId: string, id: string, reason?: string, idempotencyKey?: string) {
    const key = this.receiptKey(idempotencyKey);
    const replay = await this.replayReceipt(userId, key);
    if (replay) return replay;

    const motivo = String(reason || '').trim();
    if (motivo.length < 3) throw new BadRequestException('Indica el motivo del reagendamiento');

    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      select: { id: true, assignedTo: true, status: true },
    });
    if (!delivery || delivery.assignedTo !== userId) {
      throw new NotFoundException('Entrega no encontrada');
    }

    await this.prisma.deliveryAuditLog.create({
      data: {
        deliveryId: id,
        userId,
        action: 'RESCHEDULE_REQUESTED',
        oldValue: { status: delivery.status },
        newValue: { reason: motivo },
      },
    });

    const response = { ok: true, solicitud: 'RESCHEDULE_REQUESTED' };
    await this.saveReceipt(userId, key, 'RESCHEDULE', response, id);
    return response;
  }

  /**
   * Cierre con POD: registra cobro + evidencia y recién entonces marca la
   * entrega como DELIVERED reutilizando `DeliveryService.updateStatus` (que ya
   * cierra la orden y descuenta stock). Unique por entrega = idempotente.
   */
  async deliver(userId: string, id: string, body: any) {
    const key = this.receiptKey(body?.idempotencyKey);
    const replay = await this.replayReceipt(userId, key);
    if (replay) return replay;

    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      select: {
        id: true,
        assignedTo: true,
        deliveryDay: true,
        deliveryCode: true,
        status: true,
        order: { select: { total: true, paymentStatus: true, paymentMethod: true } },
        collection: { select: { id: true, amount: true, method: true, collectedAt: true } },
        proof: { select: { id: true, code: true, recipientName: true, createdAt: true } },
      },
    });
    if (!delivery || delivery.assignedTo !== userId) {
      throw new NotFoundException('Entrega no encontrada');
    }

    const { dia, mananaHabilitado } = await this.resolveDay();
    const dias = mananaHabilitado ? [dia, addDaysISO(dia, 1)] : [dia];
    if (!delivery.deliveryDay || !dias.includes(delivery.deliveryDay)) {
      throw new NotFoundException('Entrega no encontrada');
    }

    if (delivery.collection) {
      // Reintento: no volver a cobrar ni a crear otra prueba.
      const response = {
        id: delivery.id,
        estado: DeliveryStatus.DELIVERED,
        entregadoEn: delivery.collection.collectedAt,
        cobro: {
          monto: Number(delivery.collection.amount),
          metodo: delivery.collection.method,
        },
        evidencia: {
          codigo: delivery.proof?.code || null,
          conFoto: false,
        },
        idempotente: true,
      };
      await this.saveReceipt(userId, key, 'DELIVER', response, id);
      return response;
    }

    const permitidos: DeliveryStatus[] = [DeliveryStatus.IN_ROUTE, DeliveryStatus.ARRIVED];
    if (!permitidos.includes(delivery.status as DeliveryStatus)) {
      throw new BadRequestException('La entrega debe estar en ruta o en el punto de entrega');
    }

    const esperado = delivery.order?.paymentStatus === 'CONFIRMED'
      ? 0
      : Math.round(Number(delivery.order?.total || 0));
    const monto = this.parseAmount(body?.amount ?? esperado, 'Monto del cobro');
    if (monto !== esperado) {
      throw new BadRequestException(`El cobro debe ser ${esperado} según el pedido`);
    }
    const metodo = this.parseMethod(body?.method || delivery.order?.paymentMethod || PaymentMethod.EFECTIVO);

    const codigo = String(body?.code || '').trim();
    if (codigo && codigo !== String(delivery.deliveryCode || '').trim()) {
      throw new BadRequestException('El código de entrega no coincide');
    }
    const foto = this.validatePhoto(body?.photoDataUrl);
    if (!codigo && !foto) {
      throw new BadRequestException('Registra el código de entrega o toma una foto');
    }

    const [collection, proof] = (await this.prisma.$transaction([
      this.prisma.deliveryCollection.create({
        data: {
          deliveryId: id,
          courierId: userId,
          amount: monto,
          method: metodo,
          reference: String(body?.reference || '').trim().slice(0, 100) || null,
        },
      }),
      this.prisma.deliveryProof.create({
        data: {
          deliveryId: id,
          courierId: userId,
          code: codigo || null,
          recipientName: String(body?.recipientName || '').trim().slice(0, 120) || null,
          photoDataUrl: foto,
          notes: String(body?.notes || '').trim().slice(0, 500) || null,
        },
      }),
    ])) as any[];

    let updated: any;
    try {
      updated = await this.deliveryService.updateStatus(id, DeliveryStatus.DELIVERED, userId, {
        courier: true,
      });
    } catch (error) {
      // Si el cambio de estado falló, no dejar un cobro huérfano que bloquee
      // el reintento con el unique de deliveryId.
      await Promise.allSettled([
        this.prisma.deliveryCollection.delete({ where: { id: collection.id } }),
        this.prisma.deliveryProof.delete({ where: { id: proof.id } }),
      ]);
      throw error;
    }

    await this.prisma.deliveryAuditLog.create({
      data: {
        deliveryId: id,
        userId,
        action: 'DELIVERED_WITH_POD',
        oldValue: { status: delivery.status },
        newValue: { status: DeliveryStatus.DELIVERED, amount: monto, method: metodo, code: !!codigo, photo: !!foto },
      },
    });

    const response = {
      id: updated.id,
      estado: updated.status,
      entregadoEn: updated.deliveredAt,
      cobro: { monto, metodo },
      evidencia: { codigo: codigo || null, conFoto: !!foto },
      idempotente: false,
    };
    await this.saveReceipt(userId, key, 'DELIVER', response, id);
    return response;
  }

  /**
   * Rendición del día. Si ya hay cobros registrados se muestra lo realmente
   * recaudado; si no, se mantiene el cálculo preliminar heredado de la Fase 3.
   */
  async getRendicion(userId: string, day?: string) {
    const { dia } = await this.resolveDay(day);
    const [rows, collections, shift] = await Promise.all([
      this.prisma.delivery.findMany({
        where: { assignedTo: userId, deliveryDay: dia, status: { in: ESTADOS_VISIBLES } },
        select: {
          status: true,
          order: { select: { total: true, paymentMethod: true, paymentStatus: true } },
        },
      }),
      this.prisma.deliveryCollection.findMany({
        where: { courierId: userId, delivery: { deliveryDay: dia } },
        select: { amount: true, method: true },
      }),
      this.prisma.courierCashShift.findUnique({
        where: { courierId_day: { courierId: userId, day: dia } },
      }),
    ]);

    let entregadas = 0;
    let pendientes = 0;
    let noEntregadas = 0;

    for (const r of rows) {
      if (r.status === DeliveryStatus.DELIVERED) entregadas++;
      else if (ESTADOS_PENDIENTES.includes(r.status)) pendientes++;
      else noEntregadas++;
    }

    const registrado = collections.length > 0;
    const porRendir = registrado ? this.groupCollections(collections) : this.derivedAmounts(rows as any[]);

    return {
      dia,
      entregadas,
      pendientes,
      noEntregadas,
      porRendir,
      cerrado: pendientes === 0,
      preliminar: !registrado,
      turno: this.shiftView(shift as any),
    };
  }

  /** El repartidor declara lo que tiene en la mano y envía la rendición. */
  async closeRendicion(userId: string, body: any, day?: string) {
    const key = this.receiptKey(body?.idempotencyKey);
    const replay = await this.replayReceipt(userId, key);
    if (replay) return replay;

    const { dia } = await this.resolveDay(day);
    if (dia !== todayChileISO()) {
      throw new BadRequestException('Solo puedes cerrar la rendición del día de hoy');
    }

    const [pendientes, collections] = await Promise.all([
      this.prisma.delivery.count({
        where: { assignedTo: userId, deliveryDay: dia, status: { in: ESTADOS_PENDIENTES } },
      }),
      this.prisma.deliveryCollection.findMany({
        where: { courierId: userId, delivery: { deliveryDay: dia } },
        select: { amount: true, method: true },
      }),
    ]);
    if (pendientes > 0) {
      throw new BadRequestException(`Quedan ${pendientes} entregas sin estado final`);
    }

    const esperado = this.groupCollections(collections);
    const declarado = body?.declared || {};
    const declaredEfectivo = this.parseAmount(declarado.efectivo ?? esperado.efectivo, 'Efectivo declarado');
    const declaredTransferencia = this.parseAmount(
      declarado.transferencia ?? esperado.transferencia,
      'Transferencia declarada',
    );
    const declaredOtro = this.parseAmount(declarado.otros ?? esperado.otros, 'Otros medios declarados');
    const declaredTotal = declaredEfectivo + declaredTransferencia + declaredOtro;

    const data = {
      status: CashShiftStatus.RENDIDA,
      expectedEfectivo: esperado.efectivo,
      expectedTransferencia: esperado.transferencia,
      expectedOtro: esperado.otros,
      declaredEfectivo,
      declaredTransferencia,
      declaredOtro,
      difference: declaredTotal - esperado.total,
      notes: String(body?.notes || '').trim().slice(0, 500) || null,
      closedAt: new Date(),
      confirmedAt: null,
      confirmedById: null,
    };

    const shift = await this.prisma.courierCashShift.upsert({
      where: { courierId_day: { courierId: userId, day: dia } },
      create: { courierId: userId, day: dia, ...data },
      update: data,
    });

    await this.audit('CASH_SHIFT_CLOSED', 'courier_cash_shift', shift.id, userId, null, data);
    const response = this.shiftView(shift as any);
    await this.saveReceipt(userId, key, 'CLOSE_SHIFT', response, undefined, dia);
    return response;
  }

  // ── Panel admin: confirmación con diferencia (sin escribir en el POS) ─────

  async listRendiciones(query: any = {}) {
    const dia = this.adminDay(query?.day);
    const status = String(query?.status || '').trim().toUpperCase();
    const where: any = { day: dia };
    if (['ABIERTA', 'RENDIDA', 'CONFIRMADA', 'ANULADA'].includes(status)) where.status = status;

    const [shifts, counts] = await Promise.all([
      this.prisma.courierCashShift.findMany({
        where,
        include: {
          courier: { select: { id: true, name: true } },
          confirmedBy: { select: { id: true, name: true } },
        },
        orderBy: [{ courier: { name: 'asc' } }],
      }),
      this.prisma.deliveryCollection.groupBy({
        by: ['courierId'],
        where: { delivery: { deliveryDay: dia } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const byCourier = new Map(counts.map((c: any) => [c.courierId, c]));
    return shifts.map((s: any) => {
      const count: any = byCourier.get(s.courierId);
      return {
        ...this.shiftView(s),
        courier: s.courier,
        confirmedBy: s.confirmedBy,
        cobros: count?._count?.id || 0,
        recaudado: Number(count?._sum?.amount || 0),
      };
    });
  }

  async getRendicionAdmin(id: string) {
    const shift = await this.prisma.courierCashShift.findUnique({
      where: { id },
      include: {
        courier: { select: { id: true, name: true } },
        confirmedBy: { select: { id: true, name: true } },
      },
    });
    if (!shift) throw new NotFoundException('Rendición no encontrada');

    const collections = await this.prisma.deliveryCollection.findMany({
      where: { courierId: shift.courierId, delivery: { deliveryDay: shift.day } },
      include: {
        delivery: {
          select: {
            id: true,
            deliveryCode: true,
            order: { select: { orderNumber: true, customerName: true } },
            proof: { select: { code: true, recipientName: true, createdAt: true, photoDataUrl: true } },
          },
        },
      },
      orderBy: { collectedAt: 'desc' },
    });

    return {
      ...this.shiftView(shift as any),
      courier: shift.courier,
      confirmedBy: shift.confirmedBy,
      cobros: collections.length,
      cobrosDetalle: collections.map((c: any) => ({
        id: c.id,
        deliveryId: c.deliveryId,
        monto: Number(c.amount),
        metodo: c.method,
        referencia: c.reference,
        cobradoEn: c.collectedAt,
        pedido: c.delivery?.order?.orderNumber || null,
        cliente: c.delivery?.order?.customerName || null,
        evidencia: c.delivery?.proof
          ? {
              codigo: c.delivery.proof.code,
              receptor: c.delivery.proof.recipientName,
              conFoto: !!c.delivery.proof.photoDataUrl,
              registradaEn: c.delivery.proof.createdAt,
            }
          : null,
      })),
    };
  }

  async confirmRendicion(id: string, body: any, actorId?: string) {
    const shift = await this.prisma.courierCashShift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Rendición no encontrada');
    if (shift.status !== CashShiftStatus.RENDIDA) {
      throw new BadRequestException('Solo se pueden confirmar rendiciones enviadas por el repartidor');
    }

    const override = body?.declared || {};
    const declaredEfectivo = override.efectivo === undefined
      ? Number((shift as any).declaredEfectivo || 0)
      : this.parseAmount(override.efectivo, 'Efectivo');
    const declaredTransferencia = override.transferencia === undefined
      ? Number((shift as any).declaredTransferencia || 0)
      : this.parseAmount(override.transferencia, 'Transferencia');
    const declaredOtro = override.otros === undefined
      ? Number((shift as any).declaredOtro || 0)
      : this.parseAmount(override.otros, 'Otros medios');
    const expectedTotal =
      Number((shift as any).expectedEfectivo || 0) +
      Number((shift as any).expectedTransferencia || 0) +
      Number((shift as any).expectedOtro || 0);
    const difference = declaredEfectivo + declaredTransferencia + declaredOtro - expectedTotal;

    const updated = await this.prisma.courierCashShift.update({
      where: { id },
      data: {
        status: CashShiftStatus.CONFIRMADA,
        declaredEfectivo,
        declaredTransferencia,
        declaredOtro,
        difference,
        notes: body?.notes !== undefined
          ? String(body.notes).trim().slice(0, 500) || null
          : (shift as any).notes,
        confirmedAt: new Date(),
        confirmedById: actorId || null,
      },
    });

    await this.audit('CASH_SHIFT_CONFIRMED', 'courier_cash_shift', id, actorId, shift, updated);
    return this.getRendicionAdmin(id);
  }

  /** Evidencia completa (incluida la foto) para el admin que revisa la rendición. */
  async getProof(shiftId: string, deliveryId: string) {
    const shift = await this.prisma.courierCashShift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Rendición no encontrada');

    const proof = await this.prisma.deliveryProof.findUnique({
      where: { deliveryId },
      include: {
        delivery: {
          select: {
            assignedTo: true,
            deliveryDay: true,
            order: { select: { orderNumber: true } },
          },
        },
      },
    });
    if (
      !proof ||
      proof.delivery?.assignedTo !== shift.courierId ||
      proof.delivery?.deliveryDay !== shift.day
    ) {
      throw new NotFoundException('Prueba de entrega no encontrada');
    }

    return {
      pedido: proof.delivery.order?.orderNumber || null,
      codigo: proof.code,
      receptor: proof.recipientName,
      foto: proof.photoDataUrl,
      notas: proof.notes,
      registradaEn: proof.createdAt,
    };
  }

  // ── Helpers de dinero y auditoría ─────────────────────────────────────────

  private parseAmount(value: any, label: string): number {
    const n = Math.round(Number(value));
    if (!Number.isSafeInteger(n) || n < 0 || n > 10_000_000) {
      throw new BadRequestException(`${label} inválido`);
    }
    return n;
  }

  private parseMethod(value: any): PaymentMethod {
    const method = String(value || '').trim().toUpperCase() as PaymentMethod;
    if (!Object.values(PaymentMethod).includes(method)) {
      throw new BadRequestException('Método de pago inválido');
    }
    return method;
  }

  private validatePhoto(value: any): string | null {
    if (value === undefined || value === null || value === '') return null;
    const raw = String(value);
    const match = PHOTO_DATA_URL.exec(raw);
    if (!match) throw new BadRequestException('La foto debe ser una imagen JPEG, PNG o WebP en base64');
    if (Math.ceil((match[2].length * 3) / 4) > MAX_PHOTO_BYTES) {
      throw new BadRequestException('La foto supera el tamaño máximo permitido');
    }
    return raw;
  }

  private groupCollections(rows: any[]) {
    const result = { efectivo: 0, transferencia: 0, otros: 0, total: 0 };
    for (const row of rows) {
      const monto = Math.round(Number(row.amount) || 0);
      if (row.method === PaymentMethod.EFECTIVO) result.efectivo += monto;
      else if (row.method === PaymentMethod.TRANSFERENCIA) result.transferencia += monto;
      else result.otros += monto;
      result.total += monto;
    }
    return result;
  }

  private derivedAmounts(rows: any[]) {
    const result = { efectivo: 0, transferencia: 0, otros: 0, total: 0 };
    for (const r of rows) {
      if (r.status !== DeliveryStatus.DELIVERED || r.order?.paymentStatus === 'CONFIRMED') continue;
      const monto = Math.round(Number(r.order?.total) || 0);
      const metodo = r.order?.paymentMethod;
      if (metodo === PaymentMethod.EFECTIVO) result.efectivo += monto;
      else if (metodo === PaymentMethod.TRANSFERENCIA) result.transferencia += monto;
      else result.otros += monto;
      result.total += monto;
    }
    return result;
  }

  private shiftView(s: any) {
    if (!s) return null;
    const esperado =
      Number(s.expectedEfectivo || 0) + Number(s.expectedTransferencia || 0) + Number(s.expectedOtro || 0);
    const declarado =
      s.declaredEfectivo === null || s.declaredEfectivo === undefined
        ? null
        : Number(s.declaredEfectivo || 0) +
          Number(s.declaredTransferencia || 0) +
          Number(s.declaredOtro || 0);
    return {
      id: s.id,
      estado: s.status,
      esperado: {
        efectivo: Number(s.expectedEfectivo || 0),
        transferencia: Number(s.expectedTransferencia || 0),
        otros: Number(s.expectedOtro || 0),
        total: esperado,
      },
      declarado: {
        efectivo: Number(s.declaredEfectivo || 0),
        transferencia: Number(s.declaredTransferencia || 0),
        otros: Number(s.declaredOtro || 0),
        total: declarado,
      },
      diferencia: s.difference === null || s.difference === undefined ? null : Number(s.difference),
      cerradaEn: s.closedAt,
      confirmadaEn: s.confirmedAt,
      notas: s.notes,
    };
  }

  private adminDay(day?: string): string {
    const raw = String(day || '').trim();
    if (!raw) return todayChileISO();
    if (!BARE_DATE.test(raw)) throw new BadRequestException('Día inválido (YYYY-MM-DD)');
    return raw;
  }

  /** Claves cortas y seguras: viajan en el body y se guardan como id del recibo. */
  private receiptKey(value: any): string | null {
    const key = String(value || '').trim();
    if (!key) return null;
    if (key.length > 120 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
      throw new BadRequestException('Clave de idempotencia inválida');
    }
    return key;
  }

  /** Reenvío de la cola offline: devuelve la respuesta original sin repetir efectos. */
  private async replayReceipt(userId: string, key: string | null): Promise<any | undefined> {
    if (!key) return undefined;
    const receipt = await this.prisma.courierActionReceipt.findUnique({ where: { id: key } });
    if (!receipt) return undefined;
    if (receipt.courierId !== userId) {
      throw new BadRequestException('La clave de idempotencia pertenece a otro repartidor');
    }
    return { ...(receipt.response as any), idempotente: true };
  }

  private async saveReceipt(
    userId: string,
    key: string | null,
    action: string,
    response: any,
    deliveryId?: string,
    day?: string,
  ) {
    if (!key) return;
    try {
      await this.prisma.courierActionReceipt.create({
        data: {
          id: key,
          courierId: userId,
          action,
          deliveryId: deliveryId || null,
          day: day || null,
          response: response as Prisma.InputJsonValue,
        },
      });
    } catch (error: any) {
      // P2002: otro intento concurrentó el mismo recibo. Cualquier otro error
      // no puede deshacer una operación financiera ya realizada.
      if (error?.code !== 'P2002' && process.env.NODE_ENV !== 'test') {
        console.error('No se pudo guardar recibo de idempotencia', error);
      }
    }
  }

  private async audit(
    action: string,
    entity: string,
    entityId: string,
    userId: string | undefined,
    oldValue: any,
    newValue: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: userId || null,
          action,
          entity,
          entityId,
          oldValue: oldValue ?? Prisma.JsonNull,
          newValue: newValue ?? Prisma.JsonNull,
        },
      });
    } catch {
      // La auditoría no puede impedir una operación financiera ya realizada.
    }
  }

  private toCard(d: any): CourierRoute['entregas'][number] {
    const pagado = d.order?.paymentStatus === 'CONFIRMED';
    return {
      id: d.id,
      codigo: d.deliveryCode,
      dia: d.deliveryDay,
      ventana: { inicio: d.windowStart, fin: d.windowEnd },
      estado: d.status,
      estacion: d.station
        ? {
            nombre: d.station.name,
            linea: d.station.line,
            lineaNombre: d.station.lineName,
            comuna: d.station.commune,
          }
        : null,
      direccion: d.address || null,
      puntoEncuentro: d.meetingPoint || null,
      notas: d.notes || null,
      cliente: {
        nombre: d.customer?.name || d.order?.customerName || '',
        telefono: d.customer?.phone || '',
      },
      pedido: { numero: d.order?.orderNumber || '', total: Number(d.order?.total || 0) },
      cobro: {
        monto: pagado ? 0 : Number(d.order?.total || 0),
        estado: pagado ? 'PAGADO' : 'POR_COBRAR',
        metodo: d.order?.paymentMethod || null,
      },
    };
  }
}
