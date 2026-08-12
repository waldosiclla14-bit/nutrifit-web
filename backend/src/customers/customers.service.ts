import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.customer.findMany({
      include: { addresses: true, _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: { addresses: true, orders: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }

  async findByPhone(phone: string) {
    return this.prisma.customer.findFirst({
      where: { phone },
      include: { addresses: true },
    });
  }

  async create(data: any) {
    const name = String(data?.name || '').trim();
    const phone = String(data?.phone || '').trim();
    const email = data?.email ? String(data.email).trim().toLowerCase() : undefined;
    if (name.length < 2 || name.length > 120 || phone.length < 6 || phone.length > 30) {
      throw new BadRequestException('Nombre o teléfono inválido');
    }
    if (email && (email.length > 160 || !/^\S+@\S+\.\S+$/.test(email))) {
      throw new BadRequestException('Email inválido');
    }
    const clean = { name, phone, ...(email ? { email } : {}) };
    if (phone) {
      const existing = await this.prisma.customer.findFirst({ where: { phone } });
      if (existing) {
        return this.prisma.customer.update({
          where: { id: existing.id },
          data: clean,
          include: { addresses: true },
        });
      }
    }
    return this.prisma.customer.create({ data: clean, include: { addresses: true } });
  }

  async update(id: string, data: any) {
    const clean: Record<string, unknown> = {};
    if (data?.name !== undefined) {
      const name = String(data.name).trim();
      if (name.length < 2 || name.length > 120) throw new BadRequestException('Nombre inválido');
      clean.name = name;
    }
    if (data?.phone !== undefined) {
      const phone = String(data.phone).trim();
      if (phone.length < 6 || phone.length > 30) throw new BadRequestException('Teléfono inválido');
      clean.phone = phone;
    }
    if (data?.email !== undefined) {
      const email = String(data.email).trim().toLowerCase();
      if (email && (email.length > 160 || !/^\S+@\S+\.\S+$/.test(email))) {
        throw new BadRequestException('Email inválido');
      }
      clean.email = email || null;
    }
    if (Object.keys(clean).length === 0) throw new BadRequestException('Sin campos para actualizar');
    return this.prisma.customer.update({ where: { id }, data: clean, include: { addresses: true } });
  }

  async delete(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    if (customer._count.orders > 0) {
      throw new BadRequestException('Elimina primero las órdenes de este cliente');
    }
    await this.prisma.customer.delete({ where: { id } });
    return { id, deleted: true };
  }
}
