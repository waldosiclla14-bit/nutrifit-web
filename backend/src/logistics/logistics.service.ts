import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, Prisma, ProfitabilityStatus, Role, SettlementStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { addDaysISO, chileWeekRange, todayChileISO } from '../common/date-range';

const DEFAULT_CONFIG = { courierCost: 2500, customerFee: 1000, nutrifitSubsidy: 1500 };
const MAX_AMOUNT = 10_000_000;
const PAYMENT_METHODS = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO'];

const BARE_DATE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);

  constructor(private prisma: PrismaService) {}

  // ── Configuración ─────────────────────────────────────────────────────────

  async getConfig() {
    return this.getActiveConfig();
  }

  async getConfigHistory() {
    return this.prisma.logisticsConfig.findMany({
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  private async getActiveConfig() {
    const current = await this.prisma.logisticsConfig.findFirst({
      where: { isActive: true },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
    if (current) return current;
    try {
      return await this.prisma.logisticsConfig.create({
        data: { ...DEFAULT_CONFIG, effectiveFrom: new Date(), isActive: true },
      });
    } catch (e: any) {
      this.logger.warn(`No se pudo crear configuración logística: ${e?.message || e}`);
      // Fallback en memoria: la operación no se bloquea si la tabla aún no migró.
      return { ...DEFAULT_CONFIG, id: null, effectiveFrom: new Date(), isActive: true } as any;
    }
  }

  /**
   * Actualizar tarifas crea una versión nueva y desactiva la anterior.
   * Ninguna liquidación ni entrega histórica se recalcula.
   */
  async updateConfig(data: any, userId?: string) {
    const courierCost = this.parseAmount(data?.courierCost, 'Costo por entrega');
    const customerFee = this.parseAmount(data?.customerFee, 'Cobro al cliente');
    const nutrifitSubsidy = Number.isFinite(Number(data?.nutrifitSubsidy))
      ? this.parseAmount(data?.nutrifitSubsidy, 'Subsidio')
      : Math.max(0, courierCost - customerFee);

    const previous = await this.getActiveConfig();
    const [, config] = await this.prisma.$transaction([
      this.prisma.logisticsConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      this.prisma.logisticsConfig.create({
        data: {
          courierCost,
          customerFee,
          nutrifitSubsidy,
          effectiveFrom: new Date(),
          isActive: true,
          createdById: userId || null,
        },
      }),
    ]);

    await this.audit(userId, 'LOGISTICS_CONFIG_UPDATED', 'logistics_config', config.id, previous, config);
    return config;
  }

  // ── Rentabilidad por entrega ──────────────────────────────────────────────

  /**
   * Crea (o devuelve) el snapshot financiero de una entrega. Solo entregas
   * DELIVERED generan obligación. Los importes quedan congelados: cambiar las
   * tarifas después NO altera registros existentes.
   */
  async snapshotDelivery(deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        assignedUser: { select: { id: true, name: true } },
        order: {
          include: {
            items: {
              include: {
                variant: { select: { costPrice: true } },
                product: { select: { costPrice: true } },
              },
            },
          },
        },
      },
    });
    if (!delivery || !delivery.order) return null;

    const existing = await this.prisma.deliveryProfitability.findUnique({
      where: { deliveryId },
    });

    if (delivery.status !== DeliveryStatus.DELIVERED) {
      // Una entrega fallida/cancelada nunca genera pago automático.
      if (
        existing &&
        existing.settlementStatus !== ProfitabilityStatus.LIQUIDADO &&
        !existing.settlementId &&
        existing.chargeType === 'ENTREGA_REALIZADA'
      ) {
        return this.prisma.deliveryProfitability.update({
          where: { id: existing.id },
          data: { settlementStatus: ProfitabilityStatus.ANULADO },
        });
      }
      return existing;
    }

    if (existing) {
      // Historial bloqueado una vez liquidado o incluido en una liquidación.
      if (existing.settlementStatus === ProfitabilityStatus.LIQUIDADO || existing.settlementId) {
        return existing;
      }
      // Los montos son inmutables: se refresca la asignación del repartidor y,
      // si la entrega había quedado anulada por un intento fallido, se reactiva
      // con los importes ya congelados (nunca se pagó por ella).
      const data: any = {};
      if (delivery.assignedUser?.id && delivery.assignedUser.id !== existing.courierId) {
        data.courierId = delivery.assignedUser.id;
      }
      if (existing.settlementStatus === ProfitabilityStatus.ANULADO) {
        data.settlementStatus = ProfitabilityStatus.PENDIENTE;
        data.deliveredAt = delivery.deliveredAt || new Date();
      }
      if (Object.keys(data).length) {
        return this.prisma.deliveryProfitability.update({ where: { id: existing.id }, data });
      }
      return existing;
    }

    const config = await this.getActiveConfig();
    const order: any = delivery.order;

    const productRevenue = Math.max(
      0,
      Math.round(Number(order.subtotal) || 0) - Math.round(Number(order.discount) || 0),
    );

    let itemsCost = 0;
    for (const item of order.items || []) {
      const itemCost =
        Number(item.unitCost) ||
        Number(item.variant?.costPrice) ||
        Number(item.product?.costPrice) ||
        0;
      itemsCost += Math.round(itemCost) * (Number(item.quantity) || 0);
    }
    // Costo histórico grabado al momento de la venta; si no existe, se
    // reconstruye desde las líneas y nunca desde el precio de venta.
    const recordedCost = Math.round(Number(order.totalCost) || 0);
    const productCost = recordedCost > 0 ? recordedCost : Math.max(0, itemsCost);

    const grossProfit = productRevenue - productCost;
    const customerDeliveryFee = Math.max(0, Math.round(Number(order.shippingCost) || 0));
    const courierCost = Math.max(0, Math.round(Number(config.courierCost) || 0));
    const nutrifitSubsidy = courierCost - customerDeliveryFee;
    const logisticsResult = customerDeliveryFee - courierCost;
    const netProfit = grossProfit + logisticsResult;

    const snapshot = {
      configId: (config as any).id || null,
      courierCost,
      customerFee: customerDeliveryFee,
      nutrifitSubsidy,
      effectiveFrom: (config as any).effectiveFrom || new Date().toISOString(),
      capturedAt: new Date().toISOString(),
    };

    try {
      return await this.prisma.deliveryProfitability.create({
        data: {
          deliveryId: delivery.id,
          orderId: delivery.orderId,
          courierId: delivery.assignedUser?.id || null,
          orderNumber: order.orderNumber || '',
          customerName: order.customerName || '',
          deliveryDay: delivery.deliveryDay,
          deliveredAt: delivery.deliveredAt || new Date(),
          productRevenue,
          productCost,
          grossProfit,
          customerDeliveryFee,
          courierCost,
          nutrifitSubsidy,
          logisticsResult,
          netProfit,
          otherExpenses: 0,
          operatingResult: netProfit,
          chargeType: 'ENTREGA_REALIZADA',
          configId: snapshot.configId,
          configSnapshot: snapshot as any,
          settlementStatus: ProfitabilityStatus.PENDIENTE,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return this.prisma.deliveryProfitability.findUnique({ where: { deliveryId } });
      }
      throw e;
    }
  }

  /** Hook opcional desde entregas: crea/anula el registro financiero. */
  async onDeliveryStatusChanged(deliveryId: string) {
    try {
      await this.snapshotDelivery(deliveryId);
    } catch (e: any) {
      this.logger.warn(`No se pudo sincronizar rentabilidad de ${deliveryId}: ${e?.message || e}`);
    }
  }

  /** Garantiza que exista un snapshot para las entregas completadas del rango. */
  private async ensureEntries(scope: { from?: string; to?: string; courierId?: string } = {}) {
    const where: any = { status: DeliveryStatus.DELIVERED, deliveryDay: { not: null } };
    if (scope.from || scope.to) {
      where.deliveryDay = {};
      if (scope.from) where.deliveryDay.gte = scope.from;
      if (scope.to) where.deliveryDay.lte = scope.to;
    }
    if (scope.courierId) where.assignedTo = scope.courierId;

    // Paginación por cursor para no truncar historiales grandes.
    let cursor: string | undefined;
    const missing: string[] = [];
    for (let guard = 0; guard < 200; guard += 1) {
      const batch = await this.prisma.delivery.findMany({
        where,
        select: { id: true },
        orderBy: { id: 'asc' },
        take: 500,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (!batch.length) break;

      const present = await this.prisma.deliveryProfitability.findMany({
        where: { deliveryId: { in: batch.map((d) => d.id) } },
        select: { deliveryId: true },
      });
      const presentSet = new Set(present.map((p) => p.deliveryId));
      for (const d of batch) if (!presentSet.has(d.id)) missing.push(d.id);

      cursor = batch[batch.length - 1].id;
      if (batch.length < 500) break;
    }

    for (const id of missing) {
      try {
        await this.snapshotDelivery(id);
      } catch (e: any) {
        this.logger.warn(`Snapshot logístico falló para ${id}: ${e?.message || e}`);
      }
    }
  }

  async listEntries(query: any = {}) {
    const { from, to } = this.parseRange(query, 90);
    const courierId = query.courierId ? String(query.courierId) : undefined;
    await this.ensureEntries({ from, to, courierId });

    const where: any = { deliveryDay: { gte: from, lte: to } };
    if (courierId) where.courierId = courierId;
    if (query.status && ['PENDIENTE', 'LIQUIDADO', 'ANULADO'].includes(String(query.status))) {
      where.settlementStatus = query.status;
    }
    if (query.order) {
      where.OR = [
        { orderNumber: { contains: String(query.order), mode: 'insensitive' } },
        { customerName: { contains: String(query.order), mode: 'insensitive' } },
      ];
    }
    if (query.orderId) where.orderId = String(query.orderId);
    if (query.deliveryId) where.deliveryId = String(query.deliveryId);

    const include = {
      courier: { select: { id: true, name: true } },
      delivery: { select: { id: true, status: true, deliveryDay: true, assignedTo: true } },
      settlement: { select: { id: true, settlementNumber: true, status: true } },
    };

    const page = Math.max(0, parseInt(query.page, 10) || 0);
    const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 50));

    if (page > 0) {
      const [data, total] = await Promise.all([
        this.prisma.deliveryProfitability.findMany({
          where,
          include,
          orderBy: [{ deliveredAt: 'desc' }, { deliveryDay: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.deliveryProfitability.count({ where }),
      ]);
      return { data, total, page, limit };
    }

    return this.prisma.deliveryProfitability.findMany({
      where,
      include,
      orderBy: [{ deliveredAt: 'desc' }, { deliveryDay: 'desc' }],
      take: limit,
    });
  }

  /** Sincroniza snapshots de un rango (para reportes financieros). */
  async syncRange(from: string, to: string) {
    await this.ensureEntries({ from, to });
  }

  async summary(query: any = {}) {
    const { from, to } = this.parseRange(query, 0);
    const courierId = query.courierId ? String(query.courierId) : undefined;

    const hoy = todayChileISO();
    const semana = chileWeekRange(hoy);
    const mesInicio = `${hoy.slice(0, 7)}-01`;
    const minDay = [from, semana.from, mesInicio].sort()[0];
    const maxDay = [to, hoy].sort().slice(-1)[0];

    await this.ensureEntries({ from: minDay, to: maxDay, courierId });

    const entryWhere: any = { deliveryDay: { gte: from, lte: to } };
    if (courierId) entryWhere.courierId = courierId;

    const activeWhere = { ...entryWhere, settlementStatus: { not: ProfitabilityStatus.ANULADO } };
    const counterBase: any = { settlementStatus: { not: ProfitabilityStatus.ANULADO } };
    if (courierId) counterBase.courierId = courierId;

    const [
      totals,
      hoyCount,
      semanaCount,
      mesCount,
      pendientesPago,
      settlementPending,
      settlementPaid,
      paidDeliveries,
      config,
    ] = await Promise.all([
      this.prisma.deliveryProfitability.aggregate({
        where: activeWhere,
        _sum: {
          productRevenue: true,
          productCost: true,
          grossProfit: true,
          customerDeliveryFee: true,
          courierCost: true,
          nutrifitSubsidy: true,
          logisticsResult: true,
          netProfit: true,
          otherExpenses: true,
          operatingResult: true,
        },
        _count: { id: true },
      }),
      this.prisma.deliveryProfitability.count({
        where: { ...counterBase, deliveryDay: hoy },
      }),
      this.prisma.deliveryProfitability.count({
        where: { ...counterBase, deliveryDay: { gte: semana.from, lte: semana.to } },
      }),
      this.prisma.deliveryProfitability.count({
        where: { ...counterBase, deliveryDay: { gte: mesInicio, lte: hoy } },
      }),
      this.prisma.deliveryProfitability.aggregate({
        where: { ...entryWhere, settlementStatus: ProfitabilityStatus.PENDIENTE },
        _sum: { courierCost: true },
        _count: { id: true },
      }),
      this.prisma.courierSettlement.aggregate({
        where: { status: SettlementStatus.PENDIENTE, ...(courierId ? { courierId } : {}) },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.courierSettlement.aggregate({
        where: { status: SettlementStatus.LIQUIDADO, ...(courierId ? { courierId } : {}) },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.deliveryProfitability.aggregate({
        where: { ...entryWhere, settlementStatus: ProfitabilityStatus.LIQUIDADO },
        _sum: { courierCost: true },
      }),
      this.getActiveConfig(),
    ]);

    const num = (v: any) => Number(v) || 0;

    return {
      from,
      to,
      config,
      entregas: {
        hoy: hoyCount,
        semana: semanaCount,
        mes: mesCount,
        periodo: totals._count.id,
      },
      totalPagadoRepartidor: num(paidDeliveries._sum.courierCost),
      totalCobradoEntregas: num(totals._sum.customerDeliveryFee),
      subsidioLogistico: num(totals._sum.nutrifitSubsidy),
      costoLogisticoGenerado: num(totals._sum.courierCost),
      pendientePago: num(pendientesPago._sum.courierCost),
      pendientePagoEntregas: pendientesPago._count.id,
      gananciaComercial: num(totals._sum.grossProfit),
      gananciaDespuesLogistica: num(totals._sum.netProfit),
      resultadoOperativo: num(totals._sum.operatingResult),
      otrosGastos: num(totals._sum.otherExpenses),
      productRevenue: num(totals._sum.productRevenue),
      productCost: num(totals._sum.productCost),
      liquidacionesPendientes: {
        count: settlementPending._count.id,
        total: num(settlementPending._sum.totalAmount),
      },
      liquidacionesPagadas: {
        count: settlementPaid._count.id,
        total: num(settlementPaid._sum.totalAmount),
      },
    };
  }

  async setExceptionalCharge(entryId: string, data: any, userId?: string) {
    const entry = await this.prisma.deliveryProfitability.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Registro de rentabilidad no encontrado');
    if (entry.settlementStatus === ProfitabilityStatus.LIQUIDADO || entry.settlementId) {
      throw new BadRequestException('No se puede modificar una entrega ya liquidada');
    }

    const amount = this.parseAmount(data?.amount, 'Monto del cargo');
    const reason = String(data?.reason || '').trim();
    if (reason.length < 3) throw new BadRequestException('Indica el motivo del cargo excepcional');

    const fee = entry.customerDeliveryFee;
    const netProfit = entry.grossProfit + fee - amount;
    const updated = await this.prisma.deliveryProfitability.update({
      where: { id: entryId },
      data: {
        chargeType: amount > 0 ? 'EXCEPCIONAL' : 'ENTREGA_REALIZADA',
        chargeReason: reason,
        courierCost: amount,
        nutrifitSubsidy: amount - fee,
        logisticsResult: fee - amount,
        netProfit,
        operatingResult: netProfit - entry.otherExpenses,
        settlementStatus:
          amount > 0 ? ProfitabilityStatus.PENDIENTE : ProfitabilityStatus.ANULADO,
      },
    });

    await this.audit(userId, 'LOGISTICS_EXCEPTIONAL_CHARGE', 'delivery_profitability', entryId, entry, updated);
    return updated;
  }

  /** Entregas fallidas/canceladas recientes que aún no tienen cargo registrado. */
  async listFailedDeliveries(query: any = {}) {
    const { from, to } = this.parseRange(query, 30);
    const failedStatuses: DeliveryStatus[] = [
      DeliveryStatus.NOT_DELIVERED,
      DeliveryStatus.CUSTOMER_UNAVAILABLE,
      DeliveryStatus.INCIDENT,
      DeliveryStatus.CANCELLED,
    ];
    const deliveries = await this.prisma.delivery.findMany({
      where: { status: { in: failedStatuses }, deliveryDay: { gte: from, lte: to } },
      select: {
        id: true,
        deliveryDay: true,
        status: true,
        failureReason: true,
        assignedUser: { select: { id: true, name: true } },
        order: { select: { orderNumber: true, customerName: true, shippingCost: true } },
      },
      orderBy: { deliveryDay: 'desc' },
      take: 200,
    });
    if (!deliveries.length) return [];
    const charged = await this.prisma.deliveryProfitability.findMany({
      where: { deliveryId: { in: deliveries.map((d) => d.id) } },
      select: { deliveryId: true },
    });
    const chargedSet = new Set(charged.map((c) => c.deliveryId));
    return deliveries.filter((d) => !chargedSet.has(d.id));
  }

  /**
   * Cargo excepcional para una entrega que no se completó. Es la única vía
   * por la que una entrega fallida genera obligación de pago.
   */
  async createExceptionalCharge(data: any, userId?: string) {
    const deliveryId = String(data?.deliveryId || '').trim();
    if (!deliveryId) throw new BadRequestException('Selecciona una entrega');
    const amount = this.parseAmount(data?.amount, 'Monto del cargo');
    if (amount <= 0) throw new BadRequestException('El monto debe ser mayor a cero');
    const reason = String(data?.reason || '').trim();
    if (reason.length < 3) throw new BadRequestException('Indica el motivo del cargo excepcional');

    const existing = await this.prisma.deliveryProfitability.findUnique({ where: { deliveryId } });
    if (existing) return this.setExceptionalCharge(existing.id, { amount, reason }, userId);

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        assignedUser: { select: { id: true, name: true } },
        order: { select: { orderNumber: true, customerName: true, shippingCost: true } },
      },
    });
    if (!delivery || !delivery.order) throw new NotFoundException('Entrega no encontrada');
    if (delivery.status === DeliveryStatus.DELIVERED) {
      // Una entrega completada debe registrar su rentabilidad real primero.
      await this.snapshotDelivery(deliveryId);
      const created = await this.prisma.deliveryProfitability.findUnique({ where: { deliveryId } });
      if (created) return this.setExceptionalCharge(created.id, { amount, reason }, userId);
    }

    const config = await this.getActiveConfig();
    try {
      const entry = await this.prisma.deliveryProfitability.create({
        data: {
          deliveryId: delivery.id,
          orderId: delivery.orderId,
          courierId: delivery.assignedUser?.id || null,
          orderNumber: delivery.order.orderNumber || '',
          customerName: delivery.order.customerName || '',
          deliveryDay: delivery.deliveryDay,
          deliveredAt: delivery.deliveredAt,
          productRevenue: 0,
          productCost: 0,
          grossProfit: 0,
          customerDeliveryFee: 0,
          courierCost: amount,
          nutrifitSubsidy: amount,
          logisticsResult: -amount,
          netProfit: -amount,
          otherExpenses: 0,
          operatingResult: -amount,
          chargeType: 'EXCEPCIONAL',
          chargeReason: reason,
          configId: (config as any).id || null,
          configSnapshot: {
            courierCost: (config as any).courierCost,
            customerFee: (config as any).customerFee,
            nutrifitSubsidy: (config as any).nutrifitSubsidy,
            effectiveFrom: (config as any).effectiveFrom,
            capturedAt: new Date().toISOString(),
          } as any,
          settlementStatus: ProfitabilityStatus.PENDIENTE,
        },
      });
      await this.audit(userId, 'LOGISTICS_EXCEPTIONAL_CHARGE', 'delivery_profitability', entry.id, null, entry);
      return entry;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Esta entrega ya tiene un registro financiero');
      }
      throw e;
    }
  }

  // ── Liquidaciones ─────────────────────────────────────────────────────────

  /**
   * Entregas en curso (aún no completadas). Se muestran para seguimiento,
   * pero NO generan obligación de pago: el snapshot financiero solo se crea
   * cuando la entrega pasa a DELIVERED.
   */
  async listActiveDeliveries(query: any = {}) {
    const { from, to } = this.parseRange(query, 30);
    const terminal: DeliveryStatus[] = [
      DeliveryStatus.DELIVERED,
      DeliveryStatus.CANCELLED,
      DeliveryStatus.NOT_DELIVERED,
      DeliveryStatus.CUSTOMER_UNAVAILABLE,
      DeliveryStatus.INCIDENT,
    ];
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        status: { notIn: terminal },
        deliveryDay: { gte: from, lte: to },
      },
      select: {
        id: true,
        deliveryDay: true,
        status: true,
        windowStart: true,
        windowEnd: true,
        assignedUser: { select: { id: true, name: true } },
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            shippingCost: true,
            subtotal: true,
            discount: true,
            totalCost: true,
          },
        },
      },
      orderBy: { deliveryDay: 'asc' },
      take: 200,
    });
    return deliveries.map((d) => ({
      id: d.id,
      deliveryId: d.id,
      orderNumber: d.order?.orderNumber || '',
      customerName: d.order?.customerName || '',
      deliveryDay: d.deliveryDay,
      status: d.status,
      window: d.windowStart && d.windowEnd ? `${d.windowStart}-${d.windowEnd}` : null,
      courier: d.assignedUser,
      customerDeliveryFee: Number(d.order?.shippingCost) || 0,
      grossProfit:
        (Number(d.order?.subtotal) || 0) -
        (Number(d.order?.discount) || 0) -
        (Number(d.order?.totalCost) || 0),
      obligacionPago: false,
    }));
  }
  async listSettlements(query: any = {}) {
    const where: any = {};
    if (query.status && ['PENDIENTE', 'LIQUIDADO', 'ANULADO'].includes(String(query.status))) {
      where.status = query.status;
    }
    if (query.courierId) where.courierId = String(query.courierId);
    if (query.from || query.to) {
      if (query.from && !BARE_DATE.test(String(query.from))) {
        throw new BadRequestException('Fecha desde inválida');
      }
      if (query.to && !BARE_DATE.test(String(query.to))) {
        throw new BadRequestException('Fecha hasta inválida');
      }
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) where.createdAt.lte = new Date(`${query.to}T23:59:59.999Z`);
    }

    const take = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 100));
    return this.prisma.courierSettlement.findMany({
      where,
      include: {
        courier: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getSettlement(id: string) {
    const settlement = await this.prisma.courierSettlement.findUnique({
      where: { id },
      include: {
        courier: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            profitability: {
              select: {
                orderNumber: true,
                customerName: true,
                deliveryDay: true,
                courierCost: true,
              },
            },
          },
          orderBy: { deliveryDay: 'asc' },
        },
      },
    });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    return settlement;
  }

  async createSettlement(data: any, userId?: string) {
    const ids: string[] = Array.isArray(data?.entryIds)
      ? [...new Set<string>(data.entryIds.map((v: any) => String(v || '').trim()).filter(Boolean))]
      : [];
    if (!ids.length) throw new BadRequestException('Selecciona al menos una entrega');
    if (ids.length > 500) throw new BadRequestException('Máximo 500 entregas por liquidación');

    const entries = await this.prisma.deliveryProfitability.findMany({
      where: { id: { in: ids } },
      include: { courier: { select: { id: true, name: true } } },
    });
    if (entries.length !== ids.length) {
      throw new BadRequestException('Una o más entregas no existen');
    }

    for (const entry of entries) {
      if (entry.settlementStatus !== ProfitabilityStatus.PENDIENTE || entry.settlementId) {
        throw new BadRequestException(
          `La entrega ${entry.orderNumber} ya fue liquidada o anulada`,
        );
      }
      if (entry.courierCost <= 0) {
        throw new BadRequestException(`La entrega ${entry.orderNumber} no tiene monto a pagar`);
      }
    }

    const courierIds = [...new Set(entries.map((e) => e.courierId || ''))];
    if (courierIds.length > 1) {
      throw new BadRequestException('Todas las entregas deben ser del mismo repartidor');
    }
    const requestedCourier = data?.courierId ? String(data.courierId) : '';
    const courierId = courierIds[0] || requestedCourier || null;
    if (!courierId) {
      throw new BadRequestException('Asigna un repartidor antes de liquidar estas entregas');
    }
    if (courierIds[0] && requestedCourier && courierIds[0] !== requestedCourier) {
      throw new BadRequestException('El repartidor seleccionado no coincide con las entregas');
    }

    const courier = await this.prisma.user.findUnique({
      where: { id: courierId },
      select: { name: true, role: true },
    });
    if (!courier) throw new BadRequestException('Repartidor inválido');

    const days = entries.map((e) => e.deliveryDay).filter(Boolean) as string[];
    const periodFrom = days.sort()[0] || null;
    const periodTo = days.sort().slice(-1)[0] || null;
    const totalAmount = entries.reduce((acc, e) => acc + (Number(e.courierCost) || 0), 0);
    if (totalAmount <= 0) throw new BadRequestException('El total de la liquidación debe ser mayor a cero');

    const settlementNumber = await this.generateSettlementNumber();
    const settlementId = crypto.randomUUID();
    const now = new Date();

    try {
      await this.prisma.$transaction([
        this.prisma.courierSettlement.create({
          data: {
            id: settlementId,
            settlementNumber,
            courierId,
            courierName: courier.name,
            status: SettlementStatus.PENDIENTE,
            periodFrom,
            periodTo,
            deliveriesCount: entries.length,
            totalAmount,
            notes: String(data?.notes || '').trim() || null,
            createdById: userId || null,
          },
        }),
        this.prisma.courierSettlementItem.createMany({
          data: entries.map((e) => ({
            settlementId,
            profitabilityId: e.id,
            orderId: e.orderId,
            deliveryId: e.deliveryId,
            deliveryDay: e.deliveryDay,
            amount: e.courierCost,
          })),
        }),
        this.prisma.deliveryProfitability.updateMany({
          where: {
            id: { in: entries.map((e) => e.id) },
            settlementStatus: ProfitabilityStatus.PENDIENTE,
            settlementId: null,
          },
          data: { settlementId, courierId },
        }),
      ]);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Una de las entregas ya fue liquidada por otra operación');
      }
      throw e;
    }

    await this.audit(userId, 'SETTLEMENT_CREATED', 'courier_settlement', settlementId, null, {
      settlementNumber,
      courierId,
      totalAmount,
      deliveries: entries.length,
    });

    this.logger.log(`Liquidación ${settlementNumber} creada (${entries.length} entregas, $${totalAmount})`);
    return this.getSettlement(settlementId);
  }

  async confirmSettlement(id: string, data: any, userId?: string) {
    const settlement = await this.prisma.courierSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    if (settlement.status === SettlementStatus.LIQUIDADO) {
      throw new BadRequestException('Esta liquidación ya fue pagada');
    }
    if (settlement.status !== SettlementStatus.PENDIENTE) {
      throw new BadRequestException('Solo se pueden confirmar liquidaciones pendientes');
    }

    const paymentMethod = String(data?.paymentMethod || '').trim().toUpperCase();
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw new BadRequestException(`Método de pago inválido (${PAYMENT_METHODS.join(', ')})`);
    }

    let paymentDate = new Date();
    if (data?.paymentDate) {
      const raw = String(data.paymentDate);
      paymentDate = BARE_DATE.test(raw) ? new Date(`${raw}T12:00:00.000Z`) : new Date(raw);
      if (isNaN(paymentDate.getTime())) throw new BadRequestException('Fecha de pago inválida');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.courierSettlement.update({
        where: { id },
        data: {
          status: SettlementStatus.LIQUIDADO,
          paymentMethod,
          paymentDate,
          paidAt: new Date(),
          confirmedById: userId || null,
        },
      }),
      this.prisma.deliveryProfitability.updateMany({
        where: { settlementId: id, settlementStatus: ProfitabilityStatus.PENDIENTE },
        data: { settlementStatus: ProfitabilityStatus.LIQUIDADO },
      }),
    ]);

    await this.audit(userId, 'SETTLEMENT_PAID', 'courier_settlement', id, settlement, updated);
    return updated;
  }

  async cancelSettlement(id: string, data: any, userId?: string) {
    const settlement = await this.prisma.courierSettlement.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    if (settlement.status === SettlementStatus.LIQUIDADO) {
      throw new BadRequestException('No se puede anular una liquidación ya pagada');
    }
    if (settlement.status === SettlementStatus.ANULADO) return settlement;

    const reason = String(data?.reason || '').trim();

    const [updated] = await this.prisma.$transaction([
      this.prisma.courierSettlement.update({
        where: { id },
        data: {
          status: SettlementStatus.ANULADO,
          cancelledReason: reason || null,
          confirmedById: userId || null,
        },
      }),
      this.prisma.courierSettlementItem.deleteMany({ where: { settlementId: id } }),
      // Las entregas vuelven a estar disponibles para liquidar (no se pierden).
      this.prisma.deliveryProfitability.updateMany({
        where: { settlementId: id, settlementStatus: ProfitabilityStatus.PENDIENTE },
        data: { settlementId: null },
      }),
    ]);

    await this.audit(userId, 'SETTLEMENT_CANCELLED', 'courier_settlement', id, settlement, updated);
    return updated;
  }

  async getCouriers() {
    return this.prisma.user.findMany({
      where: { role: Role.DELIVERY, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private parseAmount(value: any, label: string): number {
    const n = Math.round(Number(value));
    if (!Number.isSafeInteger(n) || n < 0 || n > MAX_AMOUNT) {
      throw new BadRequestException(`${label} inválido`);
    }
    return n;
  }

  private parseRange(query: any, defaultDays: number): { from: string; to: string } {
    const hoy = todayChileISO();
    const to = String(query?.to || hoy);
    const fallbackFrom = defaultDays > 0 ? addDaysISO(hoy, -defaultDays) : `${hoy.slice(0, 7)}-01`;
    const from = String(query?.from || fallbackFrom);
    if (!BARE_DATE.test(from) || !BARE_DATE.test(to)) {
      throw new BadRequestException('Rango de fechas inválido (YYYY-MM-DD)');
    }
    if (from > to) throw new BadRequestException('La fecha desde no puede ser mayor que la fecha hasta');
    return { from, to };
  }

  private async generateSettlementNumber(): Promise<string> {
    const day = todayChileISO().replace(/-/g, '');
    for (let i = 0; i < 8; i += 1) {
      const candidate = `LIQ-${day}-${crypto.randomInt(1000, 9999)}`;
      const exists = await this.prisma.courierSettlement.findUnique({
        where: { settlementNumber: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    return `LIQ-${day}-${Date.now().toString().slice(-6)}`;
  }

  private async audit(
    userId: string | undefined,
    action: string,
    entity: string,
    entityId: string,
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
    } catch (e: any) {
      this.logger.warn(`Auditoría ${action} falló: ${e?.message || e}`);
    }
  }
}
