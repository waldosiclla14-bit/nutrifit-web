import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.supplier.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return supplier;
  }

  async create(data: { name: string; contactInfo?: string; paymentTerms?: string }) {
    try {
      return await this.prisma.supplier.create({ data: data as any });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('El RUT ya está registrado en otro proveedor');
      }
      throw err;
    }
  }

  async update(id: string, data: { name?: string; contactInfo?: string; paymentTerms?: string; isActive?: boolean }) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    try {
      return await this.prisma.supplier.update({ where: { id }, data: data as any });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('El RUT ya está registrado en otro proveedor');
      }
      throw err;
    }
  }

  async remove(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }
}
