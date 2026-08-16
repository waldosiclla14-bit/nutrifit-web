import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaPromise, OrderStatus, PaymentStatus, PaymentMethod, DeliveryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private couponsService: CouponsService) {}

  async findAll(query: any = {}) {
    const where: any = {};
    if (query.status) {
      if (!Object.values(OrderStatus).includes(query.status)) {
        throw new BadRequestException(`Estado inválido: ${query.status}`);
      }
      where.status = query.status;
    }
    if (query.paymentStatus) {
      if (!Object.values(PaymentStatus).includes(query.paymentStatus)) {
        throw new BadRequestException(`Estado de pago inválido: ${query.paymentStatus}`);
      }
      where.paymentStatus = query.paymentStatus;
    }
    if (query.customerId) where.customerId = query.customerId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        const d = new Date(query.dateFrom);
        if (Number.isNaN(d.getTime())) throw new BadRequestException('Fecha inválida');
        where.createdAt.gte = d;
      }
      if (query.dateTo) {
        const d = new Date(query.dateTo);
        if (Number.isNaN(d.getTime())) throw new BadRequestException('Fecha inválida');
        where.createdAt.lte = d;
      }
    }

    return this.prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: { include: { addresses: true } },
        items: { include: { product: true, variant: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');
    return order;
  }

  async create(data: any) {
    this.validateOrderPayload(data);
    const deliveryType = this.validateDeliveryType(data.deliveryType);
    const paymentMethod = this.validatePaymentMethod(data.paymentMethod);

    const subtotal = Math.max(0, Math.round(Number(data.subtotal) || 0));
    const shippingCost = Math.max(0, Math.round(Number(data.shippingCost) || 0));
    const couponCode = String(data.couponCode || '').trim().toUpperCase() || null;

    // Pre-fetch variants in a single query (pgbouncer-compatible: no
    // interactive transaction). Stock is validated here; reservation happens
    // atomically inside the non-interactive transaction below.
    const variantIds = [...new Set(data.items.filter((i: any) => i.variantId).map((i: any) => i.variantId))] as string[];
    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: { product: true },
        })
      : [];
    const variantMap = new Map(variants.map((v: any) => [v.id, v]));

    const itemsWithCost: any[] = [];
    let totalCost = 0;
    for (const item of data.items) {
      let unitCost = 0;
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant) throw new BadRequestException(`Variante ${item.variantId} no existe`);
        if (variant.stock - variant.reservedStock < item.quantity) {
          throw new BadRequestException(`Stock insuficiente para ${variant.variantName}`);
        }
        const realPrice = variant.price ?? variant.product.basePrice ?? 0;
        if (realPrice > 0 && Number(item.unitPrice) !== Number(realPrice)) {
          throw new BadRequestException(`Precio inválido para ${item.variantName || variant.variantName}`);
        }
        unitCost = variant.costPrice || variant.product.costPrice || 0;
      }
      itemsWithCost.push({ ...item, unitCost });
      totalCost += unitCost * item.quantity;
    }

    let appliedDiscount = Math.max(0, Math.round(Number(data.discount) || 0));

    if (couponCode) {
      const preview = await this.couponsService.validateCoupon({
        code: couponCode,
        phone: data.customerPhone,
        subtotal,
      });
      appliedDiscount = Math.min(
        subtotal,
        Math.round((subtotal * preview.discountPercent) / 100),
      );
    }

    const total = Math.max(0, subtotal - appliedDiscount + shippingCost);
    const profit = total - totalCost;
    const profitMargin = total > 0 ? (profit / total) * 100 : 0;

    // Claim the coupon atomically BEFORE creating the order. The atomic
    // `updateMany WHERE usedAt IS NULL` guarantees only one concurrent order
    // can consume a given coupon; the loser throws here and never creates an
    // order (no orphan orders on coupon races).
    let couponClaimed = false;
    if (couponCode) {
      await this.couponsService.consumeCoupon({
        code: couponCode,
        phone: data.customerPhone,
        orderId: null,
        subtotal,
      });
      couponClaimed = true;
    }

    const buildWrites = (orderNumber: string): PrismaPromise<any>[] => {
      const writes: PrismaPromise<any>[] = [];
      for (const item of data.items) {
        if (!item.variantId) continue;
        writes.push(
          this.prisma.productVariant.update({
            where: { id: item.variantId },
            data: { reservedStock: { increment: item.quantity } },
          }),
        );
      }

      writes.push(
        this.prisma.order.create({
          data: {
            orderNumber,
            customerId: data.customerId,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerRut: data.customerRut,
            deliveryType,
            metroLine: data.metroLine,
            metroStation: data.metroStation,
            deliveryDay: data.deliveryDay,
            deliveryTime: data.deliveryTime,
            deliveryDetails: data.deliveryDetails,
            subtotal,
            discount: appliedDiscount,
            couponCode: couponCode || null,
            shippingCost,
            total,
            totalCost,
            profit,
            profitMargin,
            paymentMethod,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            needsInvoice: data.needsInvoice || false,
            createdById: data.createdById,
            items: {
              create: itemsWithCost.map((item: any) => ({
                productId: item.productId,
                variantId: item.variantId,
                productName: item.productName,
                variantName: item.variantName,
                sku: item.sku,
                unitPrice: item.unitPrice,
                unitCost: item.unitCost,
                quantity: item.quantity,
                total: item.total,
                profit: item.total - item.unitCost * item.quantity,
              })),
            },
          },
          include: {
            customer: true,
            items: { include: { product: true, variant: true } },
          },
        }),
      );
      return writes;
    };

    // orderNumber is `count + 1`, so concurrent creates can collide. Retry on
    // the @unique violation; the coupon claim is only released on final failure.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const orderNumber = await this.generateOrderNumber();
      try {
        const results = await this.prisma.$transaction(buildWrites(orderNumber));
        const order = results[results.length - 1];
        if (couponClaimed && couponCode) {
          await this.prisma.coupon
            .updateMany({ where: { code: couponCode }, data: { usedOrderId: order.id } })
            .catch(() => undefined);
        }
        return order;
      } catch (err: any) {
        const isOrderNumberCollision = err?.code === 'P2002';
        if (!isOrderNumberCollision || attempt === 2) {
          if (couponClaimed && couponCode) {
            await this.prisma.coupon
              .updateMany({ where: { code: couponCode }, data: { usedAt: null, usedOrderId: null } })
              .catch(() => undefined);
          }
          throw err;
        }
      }
    }
    throw new BadRequestException('No se pudo crear la orden');
  }

  async deleteOrder(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.status === OrderStatus.PAID || order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('No se pueden eliminar órdenes pagadas o entregadas');
    }

    const writes: PrismaPromise<any>[] = [];
    if (order.status !== OrderStatus.CANCELLED) {
      for (const item of order.items) {
        if (item.variantId && item.quantity > 0) {
          writes.push(
            this.prisma.productVariant.update({
              where: { id: item.variantId },
              data: { reservedStock: { decrement: item.quantity } },
            }),
          );
        }
      }
    }
    writes.push(this.prisma.order.delete({ where: { id } }));
    await this.prisma.$transaction(writes);
    return { id, deleted: true };
  }

  async updateStatus(id: string, status: OrderStatus, userId?: string) {
    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException(`Estado inválido: ${status}`);
    }
    const order = await this.findOne(id);
    const oldStatus = order.status;
    if (oldStatus === status) {
      throw new BadRequestException(`La orden ya tiene estado ${status}`);
    }

    const writes: PrismaPromise<any>[] = [];
    let markPaid = false;
    let refunded = false;

    // PAID: descontar stock físicamente UNA sola vez. Solo cuando la orden
    // estaba CONFIRMADA y el pago aún no estaba confirmado (para evitar el
    // doble descuento si luego se llama a confirmPayment).
    if (status === OrderStatus.PAID && oldStatus === OrderStatus.CONFIRMED && order.paymentStatus !== PaymentStatus.CONFIRMED) {
      for (const item of order.items) {
        if (!item.variantId) continue;
        writes.push(
          this.prisma.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: { decrement: item.quantity },
              reservedStock: { decrement: item.quantity },
            },
          }),
        );
      }
      markPaid = true;
    }

    // CANCELLED: liberar la reserva o, si ya estaba pagada/entregada/devuelta,
    // reponer el stock físico (la reserva ya fue descontada).
    if (status === OrderStatus.CANCELLED) {
      const paidStates: OrderStatus[] = [OrderStatus.PAID, OrderStatus.DELIVERED, OrderStatus.RETURNED];
      const wasPaid = paidStates.includes(oldStatus);
      if (wasPaid) refunded = true;
      for (const item of order.items) {
        if (!item.variantId) continue;
        writes.push(
          this.prisma.productVariant.update({
            where: { id: item.variantId },
            data: wasPaid
              ? { stock: { increment: item.quantity } }
              : { reservedStock: { decrement: item.quantity } },
          }),
        );
      }
    }

    writes.push(
      this.prisma.order.update({
        where: { id },
        data: {
          status,
          ...(markPaid ? { paymentStatus: PaymentStatus.CONFIRMED, paidAt: new Date() } : {}),
          ...(refunded ? { paymentStatus: PaymentStatus.REFUNDED } : {}),
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          items: { include: { product: true, variant: true } },
        },
      }),
    );

    const results = await this.prisma.$transaction(writes);
    const updated = results[results.length - 1];

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'ORDER_STATUS_CHANGED',
        entity: 'Order',
        entityId: id,
        oldValue: { status: oldStatus },
        newValue: { status },
      },
    });

    return updated;
  }

  async confirmPayment(id: string, data: { paymentMethod: string; paymentNotes?: string; paymentProofUrl?: string }, userId?: string) {
    const existing = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw new NotFoundException('Orden no encontrada');
    if (existing.paymentStatus === PaymentStatus.CONFIRMED) {
      throw new BadRequestException('El pago de esta orden ya está confirmado');
    }
    if (existing.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('No se puede confirmar el pago de una orden cancelada');
    }
    if (existing.status === OrderStatus.RETURNED || existing.paymentStatus === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Esta orden ya fue reembolsada');
    }
    const paymentMethod = this.validatePaymentMethod(data.paymentMethod);

    const writes: PrismaPromise<any>[] = [];

    // Descontar stock físicamente UNA sola vez. Al llegar aquí el pago nunca
    // fue confirmado (guardia de arriba) y el descuento físico solo ocurre
    // junto con paymentStatus=CONFIRMED, por lo que el stock aún está intacto.
    for (const item of existing.items) {
      if (!item.variantId) continue;
      writes.push(
        this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: { decrement: item.quantity },
            reservedStock: { decrement: item.quantity },
          },
        }),
      );
    }

    writes.push(
      this.prisma.order.update({
        where: { id },
        data: {
          paymentStatus: PaymentStatus.CONFIRMED,
          paymentMethod,
          paymentNotes: data.paymentNotes,
          paymentProofUrl: data.paymentProofUrl,
          paidAt: new Date(),
          status: OrderStatus.PAID,
          updatedAt: new Date(),
        },
      }),
    );

    // Actualizar totales del cliente
    writes.push(
      this.prisma.customer.update({
        where: { id: existing.customerId },
        data: {
          totalSpent: { increment: existing.total },
          totalOrders: { increment: 1 },
          lastOrderAt: new Date(),
        },
      }),
    );

    // Audit log
    writes.push(
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'PAYMENT_CONFIRMED',
          entity: 'Order',
          entityId: id,
          newValue: { paymentStatus: PaymentStatus.CONFIRMED, paymentMethod },
        },
      }),
    );

    await this.prisma.$transaction(writes);
    return this.findOne(id);
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const paidStatuses = [OrderStatus.PAID, OrderStatus.DELIVERED];

    const [todaySales, yesterdaySales, monthSales, totalOrders, pendingOrders, totalCustomers, topProducts, salesByDay] =
      await Promise.all([
        this.prisma.order.aggregate({
          where: { status: { in: paidStatuses }, createdAt: { gte: today } },
          _sum: { total: true, profit: true },
          _count: true,
        }),
        this.prisma.order.aggregate({
          where: { status: { in: paidStatuses }, createdAt: { gte: yesterday, lt: today } },
          _sum: { total: true },
          _count: true,
        }),
        this.prisma.order.aggregate({
          where: { status: { in: paidStatuses }, createdAt: { gte: monthStart } },
          _sum: { total: true, profit: true },
          _count: true,
        }),
        this.prisma.order.count(),
        this.prisma.order.count({ where: { status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] } } }),
        this.prisma.customer.count(),
        this.prisma.orderItem.groupBy({
          by: ['productName'],
          where: { order: { status: { in: paidStatuses } } },
          _sum: { quantity: true, total: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        this.prisma.$queryRaw`
          SELECT
            DATE("createdAt") as date,
            SUM("total")::int as total,
            SUM("profit")::int as profit,
            COUNT(*)::int as count
          FROM "orders"
          WHERE "status" IN ('PAID', 'DELIVERED')
            AND "createdAt" >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `,
      ]);

    const todayTotal = todaySales._sum.total || 0;
    const yesterdayTotal = yesterdaySales._sum.total || 0;
    const todayProfit = todaySales._sum.profit || 0;
    const monthTotal = monthSales._sum.total || 0;
    const monthProfit = monthSales._sum.profit || 0;

    const salesGrowth =
      yesterdayTotal > 0 ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 * 10) / 10 : 0;
    const avgTicket = todaySales._count > 0 ? Math.round(todayTotal / todaySales._count) : 0;
    const monthAvgTicket = monthSales._count > 0 ? Math.round(monthTotal / monthSales._count) : 0;
    const todayMargin = todayTotal > 0 ? Math.round((todayProfit / todayTotal) * 100 * 10) / 10 : 0;
    const monthMargin = monthTotal > 0 ? Math.round((monthProfit / monthTotal) * 100 * 10) / 10 : 0;

    return {
      todaySales: todayTotal,
      todayOrders: todaySales._count,
      todayProfit,
      todayMargin,
      monthSales: monthTotal,
      monthOrders: monthSales._count,
      monthProfit,
      monthMargin,
      salesGrowth,
      avgTicket,
      monthAvgTicket,
      totalOrders,
      pendingOrders,
      totalCustomers,
      topProducts: topProducts.map((p: any) => ({
        name: p.productName,
        quantity: p._sum.quantity || 0,
        revenue: p._sum.total || 0,
      })),
      salesByDay: (salesByDay as any[]).map((d: any) => ({
        date: d.date.toISOString().split('T')[0],
        total: Number(d.total) || 0,
        profit: Number(d.profit) || 0,
        orders: Number(d.count) || 0,
      })),
    };
  }

  async getReports(query: any = {}) {
    const to = query.to ? new Date(query.to) : new Date();
    to.setHours(23, 59, 59, 999);
    const from = query.from ? new Date(query.from) : new Date(to);
    from.setHours(0, 0, 0, 0);
    from.setMonth(from.getMonth() - 1);

    const where: any = {
      status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
      createdAt: { gte: from, lte: to },
    };

    const [orders, totals, byMethod, byCategory] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          orderNumber: true,
          customerName: true,
          createdAt: true,
          paymentMethod: true,
          subtotal: true,
          discount: true,
          shippingCost: true,
          total: true,
          profit: true,
          profitMargin: true,
          items: { select: { productName: true, variantName: true, quantity: true, unitPrice: true, total: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.aggregate({
        where,
        _sum: { total: true, profit: true, subtotal: true, discount: true },
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.orderItem.groupBy({
        by: ['productName'],
        where: { order: where },
        _sum: { quantity: true, total: true, profit: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 20,
      }),
    ]);

    const total = totals._sum.total || 0;
    const profit = totals._sum.profit || 0;

    const methods = byMethod
      .filter((m: any) => m.paymentMethod)
      .map((m: any) => ({
        method: m.paymentMethod,
        total: m._sum.total || 0,
        count: m._count,
      }));

    const categories = byCategory.map((c: any) => ({
      product: c.productName,
      quantity: c._sum.quantity || 0,
      total: c._sum.total || 0,
      profit: c._sum.profit || 0,
    }));

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
      totalSales: total,
      totalProfit: profit,
      margin: total > 0 ? Math.round((profit / total) * 100 * 10) / 10 : 0,
      orderCount: totals._count,
      avgTicket: totals._count > 0 ? Math.round(total / totals._count) : 0,
      methods,
      categories,
      orders: orders.map((o: any) => ({
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        createdAt: o.createdAt,
        paymentMethod: o.paymentMethod,
        subtotal: o.subtotal,
        discount: o.discount,
        shippingCost: o.shippingCost,
        total: o.total,
        profit: o.profit,
        margin: o.profitMargin,
      })),
    };
  }

  private async generateOrderNumber(): Promise<string> {
    const count = await this.prisma.order.count();
    return `NF-${String(count + 1).padStart(6, '0')}`;
  }

  private validateOrderPayload(data: any) {
    if (!data || !Array.isArray(data.items) || data.items.length === 0 || data.items.length > 100) {
      throw new BadRequestException('La orden debe contener entre 1 y 100 productos');
    }
    if (typeof data.customerId !== 'string' || !data.customerId.trim()) {
      throw new BadRequestException('Cliente inválido');
    }
    for (const field of ['customerName', 'customerPhone']) {
      if (typeof data[field] !== 'string' || data[field].trim().length < 2 || data[field].length > 120) {
        throw new BadRequestException(`Campo inválido: ${field}`);
      }
    }
    if (data.deliveryDay != null && data.deliveryDay !== '') {
      const deliveryDay = new Date(data.deliveryDay);
      if (Number.isNaN(deliveryDay.getTime())) {
        throw new BadRequestException('Fecha de entrega inválida');
      }
    }

    const subtotal = this.integer(data.subtotal, 'subtotal');
    const discount = this.integer(data.discount ?? 0, 'descuento');
    const shipping = this.integer(data.shippingCost ?? 0, 'envío');
    const total = this.integer(data.total, 'total');
    let calculatedSubtotal = 0;

    for (const item of data.items) {
      const quantity = this.integer(item?.quantity, 'cantidad');
      if (quantity < 1 || quantity > 100) throw new BadRequestException('Cantidad inválida');
      const unitPrice = this.integer(item?.unitPrice, 'precio unitario');
      const lineTotal = this.integer(item?.total, 'total de línea');
      if (lineTotal !== unitPrice * quantity) {
        throw new BadRequestException('El total de una línea no coincide con su precio');
      }
      calculatedSubtotal += lineTotal;
    }

    if (calculatedSubtotal !== subtotal || discount > subtotal || total !== subtotal - discount + shipping) {
      throw new BadRequestException('Los totales de la orden no son válidos');
    }
  }

  private integer(value: unknown, field: string) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0) {
      throw new BadRequestException(`Valor inválido: ${field}`);
    }
    return number;
  }

  private validatePaymentMethod(value: unknown): PaymentMethod | null {
    if (value === undefined || value === null || value === '') return null;
    const v = String(value).toUpperCase();
    if (!Object.values(PaymentMethod).includes(v as PaymentMethod)) {
      throw new BadRequestException(`Método de pago inválido: ${value}`);
    }
    return v as PaymentMethod;
  }

  private validateDeliveryType(value: unknown): DeliveryType {
    const v = String(value || 'METRO').toUpperCase();
    if (!Object.values(DeliveryType).includes(v as DeliveryType)) {
      throw new BadRequestException(`Tipo de entrega inválido: ${value}`);
    }
    return v as DeliveryType;
  }
}
