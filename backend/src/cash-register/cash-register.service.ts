import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CashRegisterService {
  constructor(private prisma: PrismaService) {}

  async getCurrent() {
    return this.prisma.cashRegister.findFirst({
      where: { isOpen: true },
      include: { movements: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async open(data: { openedById: string; initialAmount: number }) {
    const existing = await this.getCurrent();
    if (existing) throw new BadRequestException('Ya existe una caja abierta');

    return this.prisma.cashRegister.create({
      data: {
        openedById: data.openedById,
        initialAmount: data.initialAmount,
        isOpen: true,
      },
      include: { movements: true },
    });
  }

  async close(id: string, data: { finalAmount: number; closedById: string }) {
    const register = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: { movements: true },
    });
    if (!register) throw new BadRequestException('Caja no encontrada');
    if (!register.isOpen) throw new BadRequestException('La caja ya está cerrada');

    const totalIncome = register.movements
      .filter((m) => m.type === 'INCOME')
      .reduce((sum, m) => sum + m.amount, 0);
    const totalExpense = register.movements
      .filter((m) => m.type === 'EXPENSE')
      .reduce((sum, m) => sum + m.amount, 0);

    const expectedAmount = register.initialAmount + totalIncome - totalExpense;

    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        closedAt: new Date(),
        finalAmount: data.finalAmount,
        expectedAmount,
        difference: data.finalAmount - expectedAmount,
        isOpen: false,
      },
    });
  }

  async addMovement(data: {
    registerId: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    reason: string;
    orderId?: string;
    createdById: string;
  }) {
    return this.prisma.cashMovement.create({
      data,
      include: { register: true },
    });
  }

  async getHistory() {
    return this.prisma.cashRegister.findMany({
      include: {
        openedBy: { select: { id: true, name: true } },
        movements: true,
      },
      orderBy: { openedAt: 'desc' },
      take: 30,
    });
  }
}
