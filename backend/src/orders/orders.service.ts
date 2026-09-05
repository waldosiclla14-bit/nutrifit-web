import { Injectable, BadRequestException, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaPromise, OrderStatus, PaymentStatus, PaymentMethod, DeliveryType, MovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { RemindersService } from '../reminders/reminders.service';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    private prisma: PrismaService,
    private couponsService: CouponsService,
    private remindersService: RemindersService,
  ) {}

  async onModuleInit() {
    await this.syncOrderCounter();
    await this.expireAbandonedOrders();
  }

  private async syncOrderCounter() {
    try {
      // Get the highest numeric suffix from existing NF-XXXXXX orderNumbers
      const rows = await this.prisma.$queryRaw<{ max_num: bigint }[]>`
        SELECT COALESCE(MAX(CAST(SUBSTRING("orderNumber" FROM 4) AS INTEGER)), 0) AS max_num
        FROM "orders"
        WHERE "orderNumber" ~ '^NF-[0-9]+$'
      `;
      const maxNum = Number(rows[0]?.max_num ?? 0);

      // Upsert the counter to at least maxNum (idempotent on restart)
      await this.prisma.$executeRaw`
        INSERT INTO "order_counters" ("id", "current")
        VALUES (1, ${maxNum})
        ON CONFLICT ("id") DO UPDATE
        SET "current" = GREATEST("order_counters"."current", ${maxNum})
      `;
      this.logger.log(`OrderCounter synced to ${maxNum}`);
    } catch (err) {
      this.logger.warn(`Could not sync OrderCounter: ${err}`);
    }
  }

  private async expireAbandonedOrders() {
    try {
      // Release reserved stock for PENDING orders older than 24 hours
      // that were created via public endpoint (createdById is null)
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const abandoned = await this.prisma.order.findMany({
        where: {
          status: OrderStatus.PENDING,
          createdById: null,
          createdAt: { lt: cutoff },
        },
        include: { items: true },
      });

      if (abandoned.length === 0) return;

      this.logger.log(`Expiring ${abandoned.length} abandoned public orders`);
      for (const order of abandoned) {
        try {
          const writes: PrismaPromise<any>[] = [];
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
          writes.push(
            this.prisma.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.CANCELLED, updatedAt: new Date() },
            }),
          );
          await this.prisma.$transaction(writes);
        } catch (e) {
          this.logger.warn(`Failed to expire order ${order.orderNumber}: ${e}`);
        }
      }
    } catch (err) {
      this.logger.warn(`expireAbandonedOrders error: ${err}`);
    }
  }

  private async createOrderReminder(order: any) {
    if (!order.customerId) return;

    const items = (order.items || [])
      .map((i: any) => `${i.quantity}x ${i.productName || i.variantName || 'item'}`)
      .join(', ');

    const deliveryInfo = [
      order.metroLine ? `Línea ${order.metroLine}` : '',
      order.metroStation ? `Estación ${order.metroStation}` : '',
      order.deliveryDay ? `Día: ${order.deliveryDay}` : '',
      order.deliveryTime ? `Hora: ${order.deliveryTime}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const title = `Pedido ${order.orderNumber} — ${order.customerName || ''}`.trim();
    const message = [
      `Pedido ${order.orderNumber}`,
      items,
      deliveryInfo,
      `Total: $${(order.total || 0).toLocaleString('es-CL')}`,
    ]
      .filter(Boolean)
      .join('\n');

    // Compute dueAt: prefer deliveryDay + deliveryTime, otherwise tomorrow 10:00
    let dueAt = new Date();
    if (order.deliveryDay) {
      // Handle ISO date strings (e.g. "2026-09-06") from POS
      const isoDateMatch = String(order.deliveryDay).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoDateMatch) {
        dueAt = new Date(`${order.deliveryDay}T10:00:00`);
      } else {
        // Handle day name strings (e.g. "Lunes", "Martes")
        const dayMap: Record<string, number> = {
          lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
          jueves: 4, viernes: 5, sábado: 6, sabado: 6, domingo: 0,
        };
        const targetDay = dayMap[String(order.deliveryDay).toLowerCase()];
        if (targetDay !== undefined) {
          const currentDay = dueAt.getDay();
          let daysAhead = targetDay - currentDay;
          if (daysAhead <= 0) daysAhead += 7;
          dueAt.setDate(dueAt.getDate() + daysAhead);
        }
      }
    } else {
      dueAt.setDate(dueAt.getDate() + 1);
    }

    // Set delivery time if provided (format "HH:mm" or similar)
    if (order.deliveryTime) {
      const timeMatch = String(order.deliveryTime).match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        dueAt.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
      } else {
        dueAt.setHours(10, 0, 0, 0);
      }
    } else {
      dueAt.setHours(10, 0, 0, 0);
    }

    await this.remindersService.create({
      customerId: order.customerId,
      title,
      message,
      dueAt: dueAt.toISOString(),
    });
  }

  private async logInventoryMovement(
    variantId: string,
    type: MovementType,
    quantity: number,
    previousStock: number,
    newStock: number,
    orderId?: string,
    userId?: string,
    notes?: string,
  ) {
    await this.prisma.inventoryMovement
      .create({
        data: { variantId, type, quantity, previousStock, newStock, orderId, userId, notes },
      })
      .catch((e) => this.logger.warn(`Failed to log inventory movement: ${e?.message}`));
  }

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

    const include = {
      customer: { select: { id: true, name: true, phone: true } },
      createdBy: { select: { id: true, name: true } },
    };

    // Pagination: if page is provided, return { data, total, page, limit }
    const page = Math.max(1, parseInt(query.page, 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));

    if (page > 0) {
      const [data, total] = await Promise.all([
        this.prisma.order.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        this.prisma.order.count({ where }),
      ]);
      return { data, total, page, limit };
    }

    return this.prisma.order.findMany({ where, include, orderBy: { createdAt: 'desc' } });
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

    // Idempotency: if client sends a key, return existing order instead of creating duplicate
    const idempotencyKey = String(data?.idempotencyKey || '').trim() || null;
    if (idempotencyKey) {
      const existing = await this.prisma.order.findUnique({
        where: { idempotencyKey },
        include: { customer: true, items: { include: { product: true, variant: true } } },
      });
      if (existing) return existing;
    }

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
        const available = variant.stock - variant.reservedStock;
        if (available < item.quantity) {
          throw new BadRequestException(`Stock insuficiente para ${variant.variantName} (disponible: ${available})`);
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

    // Recompute subtotal server-side from validated prices (never trust client)
    const subtotal = itemsWithCost.reduce(
      (sum: number, item: any) => sum + Math.round(Number(item.unitPrice) || 0) * item.quantity,
      0,
    );

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

      // Reserve stock atomically inside the transaction.
      // Uses SELECT FOR UPDATE via raw SQL to lock rows and prevent
      // concurrent orders from over-reserving the same units.
      for (const item of itemsWithCost) {
        if (!item.variantId) continue;
        writes.push(
          this.prisma.$executeRaw`
            UPDATE "product_variants"
            SET "reservedStock" = "reservedStock" + ${item.quantity}
            WHERE "id" = ${item.variantId}
              AND ("stock" - "reservedStock") >= ${item.quantity}
          `,
        );
      }

      writes.push(
        this.prisma.order.create({
          data: {
            orderNumber,
            idempotencyKey,
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

    // Atomic counter generates unique orderNumbers. Retry as safety net for
    // any residual P2002 race; coupon claim is only released on final failure.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const orderNumber = await this.generateOrderNumber();
      try {
        const results = await this.prisma.$transaction(buildWrites(orderNumber));
        const order = results[results.length - 1];

        // Verify that stock was actually reserved for all variants.
        // The WHERE clause in the UPDATE prevents negative stock but
        // silently succeeds with 0 rows if stock is insufficient.
        const verifyIds = itemsWithCost.filter(i => i.variantId).map(i => i.variantId);
        const verified = verifyIds.length
          ? await this.prisma.productVariant.findMany({
              where: { id: { in: verifyIds } },
              select: { id: true, reservedStock: true, stock: true, variantName: true },
            })
          : [];
        const verifiedMap = new Map(verified.map(v => [v.id, v]));
        for (const item of itemsWithCost) {
          if (!item.variantId) continue;
          const v = verifiedMap.get(item.variantId);
          const origVariant = variantMap.get(item.variantId);
          if (v && origVariant && v.reservedStock <= origVariant.reservedStock) {
            // Release the coupon if claimed
            if (couponClaimed && couponCode) {
              await this.prisma.coupon
                .updateMany({ where: { code: couponCode }, data: { usedAt: null, usedOrderId: null } })
                .catch(() => undefined);
            }
            throw new BadRequestException(`Stock insuficiente para ${item.variantName || v.variantName}`);
          }
        }

        if (couponClaimed && couponCode) {
          await this.prisma.coupon
            .updateMany({ where: { code: couponCode }, data: { usedOrderId: order.id } })
            .catch(() => undefined);
        }

        // Auto-create reminder in Agenda for every new order
        this.createOrderReminder(order).catch((e) =>
          this.logger.warn(`No se pudo crear recordatorio para orden ${order.orderNumber}: ${e?.message}`),
        );

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
            this.prisma.$executeRaw`
              UPDATE "product_variants"
              SET "reservedStock" = GREATEST("reservedStock" - ${item.quantity}, 0)
              WHERE "id" = ${item.variantId}
            `,
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

    // PAID: descontar stock físicamente UNA sola vez. Se ejecuta para
    // cualquier transición a PAID (PENDING→PAID, CONFIRMED→PAID, etc.)
    // siempre que el pago no haya sido confirmado previamente (para
    // evitar el doble descuento si luego se llama a confirmPayment).
    if (status === OrderStatus.PAID && order.paymentStatus !== PaymentStatus.CONFIRMED) {
      for (const item of order.items) {
        if (!item.variantId) continue;
        writes.push(
          this.prisma.$executeRaw`
            UPDATE "product_variants"
            SET "stock" = GREATEST("stock" - ${item.quantity}, 0),
                "reservedStock" = GREATEST("reservedStock" - ${item.quantity}, 0)
            WHERE "id" = ${item.variantId} AND "stock" >= ${item.quantity}
          `,
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
          wasPaid
            ? this.prisma.$executeRaw`
                UPDATE "product_variants"
                SET "stock" = "stock" + ${item.quantity}
                WHERE "id" = ${item.variantId}
              `
            : this.prisma.$executeRaw`
                UPDATE "product_variants"
                SET "reservedStock" = GREATEST("reservedStock" - ${item.quantity}, 0)
                WHERE "id" = ${item.variantId}
              `,
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

    // Update customer lifetime stats when marking as paid
    if (markPaid) {
      writes.push(
        this.prisma.customer.update({
          where: { id: order.customerId },
          data: {
            totalSpent: { increment: order.total },
            totalOrders: { increment: 1 },
            lastOrderAt: new Date(),
          },
        }),
      );
    }

    const results = await this.prisma.$transaction(writes);
    const updated = results[results.length - 1];

    // Post-transaction safety + inventory movement logging
    if (markPaid || refunded) {
      const variantIds = order.items.filter(i => i.variantId).map(i => i.variantId);
      const variantsPost = variantIds.length
        ? await this.prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: { id: true, stock: true, variantName: true, product: { select: { name: true } } },
          })
        : [];
      const variantPostMap = new Map(variantsPost.map(v => [v.id, v]));

      for (const item of order.items) {
        if (!item.variantId) continue;
        const v = variantPostMap.get(item.variantId);
        if (markPaid && v && v.stock < 0) {
          this.logger.error(`Stock negativo post-transacción: ${v.variantName || v.product?.name} = ${v.stock}`);
        }
        const newStock = v?.stock ?? 0;
        if (markPaid) {
          this.logInventoryMovement(item.variantId, MovementType.SALE, -item.quantity, newStock + item.quantity, newStock, id, userId, `Venta ${order.orderNumber}`);
        }
        if (refunded) {
          this.logInventoryMovement(item.variantId, MovementType.CANCEL, item.quantity, newStock - item.quantity, newStock, id, userId, `Cancelación ${order.orderNumber}`);
        }
      }
    }

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

    // Descontar stock físicamente UNA sola vez. El WHERE previene stock negativo.
    for (const item of existing.items) {
      if (!item.variantId) continue;
      writes.push(
        this.prisma.$executeRaw`
          UPDATE "product_variants"
          SET "stock" = GREATEST("stock" - ${item.quantity}, 0),
              "reservedStock" = GREATEST("reservedStock" - ${item.quantity}, 0)
          WHERE "id" = ${item.variantId} AND "stock" >= ${item.quantity}
        `,
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

    // Log inventory movements after successful transaction
    const confirmVariantIds = existing.items.filter(i => i.variantId).map(i => i.variantId);
    const confirmVariants = confirmVariantIds.length
      ? await this.prisma.productVariant.findMany({
          where: { id: { in: confirmVariantIds } },
          select: { id: true, stock: true },
        })
      : [];
    const confirmVariantMap = new Map(confirmVariants.map(v => [v.id, v]));
    for (const item of existing.items) {
      if (!item.variantId) continue;
      const v = confirmVariantMap.get(item.variantId);
      const newStock = v?.stock ?? 0;
      this.logInventoryMovement(item.variantId, MovementType.SALE, -item.quantity, newStock + item.quantity, newStock, id, userId, `Pago confirmado ${existing.orderNumber}`);
    }

    return this.findOne(id);
  }

  async updatePaymentMethod(id: string, data: { paymentMethod: string; paymentNotes?: string }, userId?: string) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Orden no encontrada');

    const paymentMethod = this.validatePaymentMethod(data.paymentMethod);
    if (!paymentMethod) {
      throw new BadRequestException('Debes indicar un método de pago válido');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        paymentMethod,
        paymentNotes: data.paymentNotes ?? existing.paymentNotes,
        updatedAt: new Date(),
      },
      include: {
        customer: true,
        items: { include: { product: true, variant: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PAYMENT_METHOD_CHANGED',
        entity: 'Order',
        entityId: id,
        oldValue: { paymentMethod: existing.paymentMethod },
        newValue: { paymentMethod, paymentNotes: data.paymentNotes ?? existing.paymentNotes },
      },
    });

    return updated;
  }

  async updateOrder(id: string, data: any, userId?: string) {
    this.validateOrderPayload(data);
    const deliveryType = this.validateDeliveryType(data.deliveryType);
    const paymentMethod = this.validatePaymentMethod(data.paymentMethod);

    const existing = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new NotFoundException('Orden no encontrada');
    if (existing.status === OrderStatus.CANCELLED || existing.status === OrderStatus.RETURNED) {
      throw new BadRequestException('No se puede editar una orden cancelada o devuelta');
    }

    const isPaid = existing.paymentStatus === PaymentStatus.CONFIRMED;
    const subtotal = Math.max(0, Math.round(Number(data.subtotal) || 0));
    const shippingCost = Math.max(0, Math.round(Number(data.shippingCost) || 0));
    const discount = Math.max(0, Math.round(Number(data.discount) || 0));
    const total = Math.max(0, subtotal - discount + shippingCost);

    const variantIds = [...new Set(data.items.filter((i: any) => i.variantId).map((i: any) => i.variantId))] as string[];
    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: { product: true },
        })
      : [];
    const variantMap = new Map(variants.map((v: any) => [v.id, v]));

    const oldByVariant = new Map<string, number>();
    for (const item of existing.items) {
      if (!item.variantId) continue;
      oldByVariant.set(item.variantId, (oldByVariant.get(item.variantId) || 0) + item.quantity);
    }

    const itemsWithCost: any[] = [];
    let totalCost = 0;
    for (const item of data.items) {
      let unitCost = 0;
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant) throw new BadRequestException(`Variante ${item.variantId} no existe`);
        const released = oldByVariant.get(item.variantId) || 0;
        const available = variant.stock + released;
        if (available < item.quantity) {
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

    const profit = total - totalCost;
    const profitMargin = total > 0 ? (profit / total) * 100 : 0;

    const writes: PrismaPromise<any>[] = [];

    const oldVariantIds = [...oldByVariant.keys()];
    const oldVariants = oldVariantIds.length
      ? await this.prisma.productVariant.findMany({ where: { id: { in: oldVariantIds } } })
      : [];
    const oldVariantMap = new Map(oldVariants.map((v: any) => [v.id, v]));
    for (const [vid, qty] of oldByVariant) {
      const variant = oldVariantMap.get(vid);
      if (!variant) continue;
      writes.push(
        isPaid
          ? this.prisma.$executeRaw`UPDATE "product_variants" SET "stock" = "stock" + ${qty} WHERE "id" = ${vid}`
          : this.prisma.$executeRaw`UPDATE "product_variants" SET "reservedStock" = GREATEST("reservedStock" - ${qty}, 0) WHERE "id" = ${vid}`,
      );
    }

    for (const item of data.items) {
      if (!item.variantId) continue;
      writes.push(
        isPaid
          ? this.prisma.$executeRaw`UPDATE "product_variants" SET "stock" = GREATEST("stock" - ${item.quantity}, 0), "reservedStock" = GREATEST("reservedStock" - ${item.quantity}, 0) WHERE "id" = ${item.variantId} AND "stock" >= ${item.quantity}`
          : this.prisma.$executeRaw`UPDATE "product_variants" SET "reservedStock" = "reservedStock" + ${item.quantity} WHERE "id" = ${item.variantId} AND ("stock" - "reservedStock") >= ${item.quantity}`,
      );
    }

    writes.push(this.prisma.orderItem.deleteMany({ where: { orderId: id } }));
    writes.push(
      this.prisma.order.update({
        where: { id },
        data: {
          deliveryType,
          metroLine: data.metroLine,
          metroStation: data.metroStation,
          deliveryDay: data.deliveryDay,
          deliveryTime: data.deliveryTime,
          deliveryDetails: data.deliveryDetails,
          subtotal,
          discount,
          shippingCost,
          total,
          totalCost,
          profit,
          profitMargin,
          paymentMethod,
          updatedAt: new Date(),
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
        include: { customer: true, items: { include: { product: true, variant: true } } },
      }),
    );

    const results = await this.prisma.$transaction(writes);
    const updated = results[results.length - 1];

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'ORDER_UPDATED',
        entity: 'Order',
        entityId: id,
        oldValue: {
          total: existing.total,
          itemCount: existing.items.length,
          deliveryType: existing.deliveryType,
          metroStation: existing.metroStation,
          paymentMethod: existing.paymentMethod,
        },
        newValue: {
          total,
          itemCount: data.items.length,
          deliveryType,
          metroStation: data.metroStation,
          paymentMethod,
        },
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

    // Consolidate 3 aggregates + 2 counts + top products + salesByDay into 4 queries
    const [salesStats, counts, topProducts, salesByDay] = await Promise.all([
      // Single raw SQL for today/yesterday/month aggregates
      this.prisma.$queryRaw<{
        today_total: bigint; today_profit: bigint; today_count: bigint;
        yesterday_total: bigint; yesterday_count: bigint;
        month_total: bigint; month_profit: bigint; month_count: bigint;
      }[]>`
        SELECT
          SUM(CASE WHEN "createdAt" >= ${today} THEN "total" ELSE 0 END)::int AS today_total,
          SUM(CASE WHEN "createdAt" >= ${today} THEN "profit" ELSE 0 END)::int AS today_profit,
          COUNT(CASE WHEN "createdAt" >= ${today} THEN 1 END)::int AS today_count,
          SUM(CASE WHEN "createdAt" >= ${yesterday} AND "createdAt" < ${today} THEN "total" ELSE 0 END)::int AS yesterday_total,
          COUNT(CASE WHEN "createdAt" >= ${yesterday} AND "createdAt" < ${today} THEN 1 END)::int AS yesterday_count,
          SUM(CASE WHEN "createdAt" >= ${monthStart} THEN "total" ELSE 0 END)::int AS month_total,
          SUM(CASE WHEN "createdAt" >= ${monthStart} THEN "profit" ELSE 0 END)::int AS month_profit,
          COUNT(CASE WHEN "createdAt" >= ${monthStart} THEN 1 END)::int AS month_count
        FROM "orders"
        WHERE "status" IN ('PAID', 'DELIVERED')
      `,
      // Combined count query
      Promise.all([
        this.prisma.order.count(),
        this.prisma.order.count({ where: { status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] } } }),
        this.prisma.customer.count(),
      ]),
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

    const s = salesStats[0];
    const todayTotal = Number(s.today_total);
    const yesterdayTotal = Number(s.yesterday_total);
    const todayProfit = Number(s.today_profit);
    const monthTotal = Number(s.month_total);
    const monthProfit = Number(s.month_profit);
    const todayCount = Number(s.today_count);
    const monthCount = Number(s.month_count);

    const [totalOrders, pendingOrders, totalCustomers] = counts;

    const salesGrowth =
      yesterdayTotal > 0 ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 * 10) / 10 : 0;
    const avgTicket = todayCount > 0 ? Math.round(todayTotal / todayCount) : 0;
    const monthAvgTicket = monthCount > 0 ? Math.round(monthTotal / monthCount) : 0;
    const todayMargin = todayTotal > 0 ? Math.round((todayProfit / todayTotal) * 100 * 10) / 10 : 0;
    const monthMargin = monthTotal > 0 ? Math.round((monthProfit / monthTotal) * 100 * 10) / 10 : 0;

    return {
      todaySales: todayTotal,
      todayOrders: todayCount,
      todayProfit,
      todayMargin,
      monthSales: monthTotal,
      monthOrders: monthCount,
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
    // Atomic increment — two concurrent callers will NEVER get the same number.
    const rows = await this.prisma.$queryRaw<{ next: number }[]>`
      UPDATE "order_counters"
      SET "current" = "current" + 1
      WHERE "id" = 1
      RETURNING "current" AS "next"
    `;
    if (!rows.length) {
      // Counter row missing (should never happen). Insert and retry.
      await this.prisma.$executeRaw`INSERT INTO "order_counters" ("id", "current") VALUES (1, 1) ON CONFLICT DO NOTHING`;
      const retry = await this.prisma.$queryRaw<{ next: number }[]>`
        UPDATE "order_counters"
        SET "current" = "current" + 1
        WHERE "id" = 1
        RETURNING "current" AS "next"
      `;
      return `NF-${String(retry[0].next).padStart(6, '0')}`;
    }
    return `NF-${String(rows[0].next).padStart(6, '0')}`;
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
