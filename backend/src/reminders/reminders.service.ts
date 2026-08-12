import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReminderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RemindersService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    const where =
      status === 'PENDING' || status === 'DONE'
        ? ({ status: status as ReminderStatus } as const)
        : {};
    return this.prisma.reminder.findMany({
      where,
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
    });
  }

  async create(data: any) {
    const customerId = String(data?.customerId || '').trim();
    const title = String(data?.title || '').trim();
    const message = String(data?.message || '').trim();
    const dueAt = data?.dueAt ? new Date(data.dueAt) : null;

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new BadRequestException('Cliente no encontrado');
    if (title.length < 1 || title.length > 120) throw new BadRequestException('Título inválido');
    if (message.length < 1 || message.length > 1000) throw new BadRequestException('Mensaje inválido');
    if (!dueAt || Number.isNaN(dueAt.getTime())) throw new BadRequestException('Fecha/hora inválida');

    return this.prisma.reminder.create({
      data: { customerId, title, message, dueAt },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.reminder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Recordatorio no encontrado');

    const clean: Record<string, unknown> = {};
    if (data?.title !== undefined) {
      const title = String(data.title).trim();
      if (title.length < 1 || title.length > 120) throw new BadRequestException('Título inválido');
      clean.title = title;
    }
    if (data?.message !== undefined) {
      const message = String(data.message).trim();
      if (message.length < 1 || message.length > 1000) throw new BadRequestException('Mensaje inválido');
      clean.message = message;
    }
    if (data?.dueAt !== undefined) {
      const dueAt = data.dueAt ? new Date(data.dueAt) : null;
      if (!dueAt || Number.isNaN(dueAt.getTime())) throw new BadRequestException('Fecha/hora inválida');
      clean.dueAt = dueAt;
    }
    if (data?.customerId !== undefined) {
      const customer = await this.prisma.customer.findUnique({ where: { id: String(data.customerId) } });
      if (!customer) throw new BadRequestException('Cliente no encontrado');
      clean.customerId = String(data.customerId);
    }
    if (data?.status !== undefined) {
      const status = data.status === 'DONE' ? ReminderStatus.DONE : ReminderStatus.PENDING;
      clean.status = status;
      clean.sentAt = status === ReminderStatus.DONE ? new Date() : null;
    }

    if (Object.keys(clean).length === 0) throw new BadRequestException('Sin campos para actualizar');
    return this.prisma.reminder.update({
      where: { id },
      data: clean,
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.reminder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Recordatorio no encontrado');
    await this.prisma.reminder.delete({ where: { id } });
    return { id, deleted: true };
  }
}
