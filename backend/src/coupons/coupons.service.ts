import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Coupon } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type CouponPayload = {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  discountPercent?: number;
  daysValid?: number;
};

type CouponValidation = {
  code: string;
  discountPercent: number;
  discountAmount: number;
  customerName: string;
  expiresAt: string | null;
};

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  private normalizePhone(value: string | undefined | null) {
    return String(value ?? '').replace(/\D/g, '');
  }

  private normalizeCode(value: string | undefined | null) {
    return String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  private initials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase();
  }

  private randomSegment(length = 4) {
    return randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .toUpperCase()
      .slice(0, length);
  }

  private clampPercent(value: unknown, fallback = 10) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(90, Math.round(n));
  }

  private clampDays(value: unknown, fallback = 30) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(365, Math.round(n));
  }

  private async generateUniqueCode(tx: Prisma.TransactionClient, name: string, phone: string) {
    const prefix = this.initials(name) || 'NF';
    const suffix = phone.slice(-4).padStart(4, '0');

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = `NF-${prefix}-${suffix}-${this.randomSegment(4)}`;
      const exists = await tx.coupon.findUnique({ where: { code } });
      if (!exists) return code;
    }

    throw new BadRequestException('No se pudo generar un código único');
  }

  private async getValidCoupon(tx: Prisma.TransactionClient, code: string, phone: string) {
    const normalizedCode = this.normalizeCode(code);
    const normalizedPhone = this.normalizePhone(phone);

    if (!normalizedCode) {
      throw new BadRequestException('Código de cupón inválido');
    }
    if (!normalizedPhone) {
      throw new BadRequestException('El cupón requiere un teléfono válido');
    }

    const coupon = await tx.coupon.findUnique({ where: { code: normalizedCode } });
    if (!coupon) throw new NotFoundException('Cupón no encontrado');
    if (!coupon.isActive) throw new BadRequestException('Cupón inactivo');
    if (coupon.usedAt) throw new BadRequestException('Este cupón ya fue usado');
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Cupón vencido');
    }
    if (this.normalizePhone(coupon.customerPhone) !== normalizedPhone) {
      throw new BadRequestException('Este cupón pertenece a otro teléfono');
    }
    return coupon;
  }

  async peekCouponInTx(tx: Prisma.TransactionClient, body: { code: string; phone: string }) {
    return this.getValidCoupon(tx, body.code, body.phone);
  }

  async generateForCustomer(payload: CouponPayload) {
    const customerId = payload.customerId?.trim();
    const customer = customerId
      ? await this.prisma.customer.findUnique({ where: { id: customerId } })
      : null;

    const customerName = (customer?.name || payload.customerName || '').trim();
    const customerPhone = this.normalizePhone(customer?.phone || payload.customerPhone);
    if (customerName.length < 2) throw new BadRequestException('Nombre de cliente inválido');
    if (customerPhone.length < 6) throw new BadRequestException('Teléfono de cliente inválido');

    const discountPercent = this.clampPercent(payload.discountPercent, 10);
    const daysValid = this.clampDays(payload.daysValid, 30);
    const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);

    const code = await this.generateUniqueCode(this.prisma, customerName, customerPhone);

    const deactivate =
      customerId !== undefined
        ? this.prisma.coupon.updateMany({
            where: { customerId, usedAt: null, isActive: true },
            data: { isActive: false },
          })
        : this.prisma.coupon.updateMany({
            where: { customerPhone, usedAt: null, isActive: true },
            data: { isActive: false },
          });

    const create = this.prisma.coupon.create({
      data: {
        code,
        customerId: customer?.id ?? null,
        customerName,
        customerPhone,
        discountPercent,
        expiresAt,
        isActive: true,
      },
    });

    // Non-interactive transaction (compatible with Neon pgbouncer/transaction mode)
    const results = await this.prisma.$transaction([deactivate, create]);
    return results[1];
  }

  async consumeCoupon(body: { code: string; phone: string; orderId?: string; subtotal: number }) {
    const coupon = await this.getValidCoupon(this.prisma, body.code, body.phone);
    const subtotal = Math.max(0, Math.round(Number(body.subtotal) || 0));
    const discountAmount = Math.min(
      subtotal,
      Math.round((subtotal * coupon.discountPercent) / 100),
    );

    const updated = await this.prisma.coupon.updateMany({
      where: { id: coupon.id, usedAt: null, isActive: true },
      data: {
        usedAt: new Date(),
        usedOrderId: body.orderId ?? null,
      },
    });

    if (!updated.count) {
      throw new BadRequestException('Este cupón ya fue usado');
    }

    return { coupon, discountAmount };
  }

  async validateCoupon(body: { code: string; phone: string; subtotal?: number }) {
    const coupon = await this.getValidCoupon(this.prisma, body.code, body.phone);
    const subtotal = Math.max(0, Math.round(Number(body.subtotal) || 0));
    const discountAmount = Math.min(
      subtotal,
      Math.round((subtotal * coupon.discountPercent) / 100),
    );
    return this.toResponse(coupon, discountAmount);
  }

  async consumeCouponInTx(
    tx: Prisma.TransactionClient,
    body: { code: string; phone: string; subtotal: number; orderId?: string },
  ) {
    const coupon = await this.getValidCoupon(tx, body.code, body.phone);
    const subtotal = Math.max(0, Math.round(body.subtotal));
    const discountAmount = Math.min(
      subtotal,
      Math.round((subtotal * coupon.discountPercent) / 100),
    );

    const updated = await tx.coupon.updateMany({
      where: { id: coupon.id, usedAt: null, isActive: true },
      data: {
        usedAt: new Date(),
        usedOrderId: body.orderId ?? null,
      },
    });

    if (!updated.count) {
      throw new BadRequestException('Este cupón ya fue usado');
    }

    return { coupon, discountAmount };
  }

  private toResponse(coupon: Coupon, discountAmount = 0): CouponValidation {
    return {
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      discountAmount,
      customerName: coupon.customerName,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
    };
  }
}
