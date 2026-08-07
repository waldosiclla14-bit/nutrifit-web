import { Injectable } from '@nestjs/common';
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
    if (data.phone) {
      const existing = await this.prisma.customer.findFirst({ where: { phone: data.phone } });
      if (existing) {
        return this.prisma.customer.update({
          where: { id: existing.id },
          data,
          include: { addresses: true },
        });
      }
    }
    return this.prisma.customer.create({ data, include: { addresses: true } });
  }

  async update(id: string, data: any) {
    return this.prisma.customer.update({ where: { id }, data, include: { addresses: true } });
  }
}
