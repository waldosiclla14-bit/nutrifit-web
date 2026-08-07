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
        auditLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');
    return order;
  }

  async create(data: any) {
    const orderNumber = await this.generateOrderNumber();

    // Validar stock y reservar (solo items con variante en la DB)
    for (const item of data.items) {
      if (!item.variantId) continue;
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: item.variantId },
      });
      if (!variant) throw new BadRequestException(`Variante ${item.variantId} no existe`);
      if (variant.stock - variant.reservedStock < item.quantity) {
        throw new BadRequestException(`Stock insuficiente para ${variant.variantName}`);
      }
    }

    // Reservar stock
    for (const item of data.items) {
      if (!item.variantId) continue;
      await this.prisma.productVariant.update({
        where: { id: item.variantId },
        data: { reservedStock: { increment: item.quantity } },
      });
    }

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
        deliveryDetails: data.deliveryDetails,
        subtotal: data.subtotal,
        discount: data.discount || 0,
        shippingCost: data.shippingCost || 0,
        total: data.total,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        needsInvoice: data.needsInvoice || false,
        createdById: data.createdById,
        items: {
          create: data.items.map((item: any) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            sku: item.sku,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            total: item.total,
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

    const [todaySales, monthSales, totalOrders, pendingOrders, totalCustomers] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] }, createdAt: { gte: today } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] }, createdAt: { gte: monthStart } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] } } }),
      this.prisma.customer.count(),
    ]);

    return {
      todaySales: todaySales._sum.total || 0,
      todayOrders: todaySales._count,
      monthSales: monthSales._sum.total || 0,
      monthOrders: monthSales._count,
      totalOrders,
      pendingOrders,
      totalCustomers,
    };
  }

  private async generateOrderNumber(): Promise<string> {
    const count = await this.prisma.order.count();
    return `NF-${String(count + 1).padStart(6, '0')}`;
  }
}
