import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any = {}) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.customerId) where.customerId = query.customerId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    return this.prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: true, variant: true } },
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
    const orderNumber = await this.generateOrderNumber();

    // Validar stock, calcular costos unitarios y reservar (solo items con variante en la DB)
    const itemsWithCost: any[] = [];
    let totalCost = 0;

    for (const item of data.items) {
      let unitCost = 0;
      if (item.variantId) {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });
        if (!variant) throw new BadRequestException(`Variante ${item.variantId} no existe`);
        if (variant.stock - variant.reservedStock < item.quantity) {
          throw new BadRequestException(`Stock insuficiente para ${variant.variantName}`);
        }
        unitCost = variant.costPrice || variant.product.costPrice || 0;
      }

      itemsWithCost.push({ ...item, unitCost });
      totalCost += unitCost * item.quantity;
    }

    // Reservar stock
    for (const item of data.items) {
      if (!item.variantId) continue;
      await this.prisma.productVariant.update({
        where: { id: item.variantId },
        data: { reservedStock: { increment: item.quantity } },
      });
    }

    const total = data.total;
    const profit = total - totalCost;
    const profitMargin = total > 0 ? (profit / total) * 100 : 0;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        customerId: data.customerId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerRut: data.customerRut,
        deliveryType: data.deliveryType || 'METRO',
        metroLine: data.metroLine,
        metroStation: data.metroStation,
        deliveryDay: data.deliveryDay,
        deliveryTime: data.deliveryTime,
        deliveryDetails: data.deliveryDetails,
        subtotal: data.subtotal,
        discount: data.discount || 0,
        shippingCost: data.shippingCost || 0,
        total,
        totalCost,
        profit,
        profitMargin,
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
    });

    return order;
  }

  async resetHistory() {
    return this.prisma.$transaction(async (tx) => {
      const orders = await tx.order.count();
      const customers = await tx.customer.count();
      await tx.orderItem.deleteMany();
      await tx.order.deleteMany();
      await tx.customer.deleteMany();
      return { orders, customers };
    });
  }

  async updateStatus(id: string, status: OrderStatus, userId?: string) {
    const order = await this.findOne(id);
    const oldStatus = order.status;

    // Lógica de transición de estados
    if (status === OrderStatus.PAID && oldStatus === OrderStatus.CONFIRMED) {
      // Confirmar stock: descontar físicamente
      for (const item of order.items) {
        if (!item.variantId) continue;
        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: { decrement: item.quantity },
            reservedStock: { decrement: item.quantity },
          },
        });
      }
    }

    if (status === OrderStatus.CANCELLED) {
      // Liberar stock reservado
      for (const item of order.items) {
        if (!item.variantId) continue;
        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: { reservedStock: { decrement: item.quantity } },
        });
      }
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      include: {
        customer: true,
        items: { include: { product: true, variant: true } },
      },
    });

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
    const order = await this.prisma.order.update({
      where: { id },
      data: {
        paymentStatus: PaymentStatus.CONFIRMED,
        paymentMethod: data.paymentMethod as any,
        paymentNotes: data.paymentNotes,
        paymentProofUrl: data.paymentProofUrl,
        paidAt: new Date(),
        status: OrderStatus.PAID,
      },
      include: { items: true },
    });

    // Descontar stock físicamente
    for (const item of order.items) {
      if (!item.variantId) continue;
      await this.prisma.productVariant.update({
        where: { id: item.variantId },
        data: {
          stock: { decrement: item.quantity },
          reservedStock: { decrement: item.quantity },
        },
      });
    }

    // Actualizar totales del cliente
    await this.prisma.customer.update({
      where: { id: order.customerId },
      data: {
        totalSpent: { increment: order.total },
        totalOrders: { increment: 1 },
        lastOrderAt: new Date(),
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PAYMENT_CONFIRMED',
        entity: 'Order',
        entityId: id,
        newValue: { paymentStatus: PaymentStatus.CONFIRMED, paymentMethod: data.paymentMethod },
      },
    });

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
}
