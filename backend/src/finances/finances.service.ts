import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { rangeBound } from '../common/date-range';

const DEFAULT_CATEGORIES = [
  { name: 'Arriendo', color: '#8b5cf6' },
  { name: 'Sueldos', color: '#0ea5e9' },
  { name: 'Marketing', color: '#ec4899' },
  { name: 'Servicios', color: '#f59e0b' },
  { name: 'Insumos', color: '#16a34a' },
  { name: 'Otros', color: '#64748b' },
];

@Injectable()
export class FinancesService {
  constructor(private prisma: PrismaService) {}

  // ── Categorías ──────────────────────────────────────────────
  async listCategories(includeInactive = false) {
    await this.ensureDefaults();
    return this.prisma.expenseCategory.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(data: { name: string; color?: string }) {
    const name = String(data?.name || '').trim();
    if (name.length < 2 || name.length > 60) throw new BadRequestException('Nombre de categoría inválido');
    await this.ensureDefaults();
    try {
      return await this.prisma.expenseCategory.create({
        data: { name, color: String(data?.color || '').trim() || null },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException('Ya existe esa categoría');
      throw e;
    }
  }

  private async ensureDefaults() {
    const count = await this.prisma.expenseCategory.count().catch(() => 1);
    if (count > 0) return;
    for (const c of DEFAULT_CATEGORIES) {
      await this.prisma.expenseCategory.upsert({
        where: { name: c.name },
        update: {},
        create: c,
      }).catch(() => undefined);
    }
  }

  // ── Gastos ──────────────────────────────────────────────────
  async listExpenses(query: any = {}) {
    const where: any = {};
    if (query.categoryId) where.categoryId = String(query.categoryId);
    if (query.from || query.to) {
      where.spentAt = {};
      if (query.from) where.spentAt.gte = rangeBound(query.from, false);
      if (query.to) where.spentAt.lte = rangeBound(query.to, true);
    }
    const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 50));
    return this.prisma.expense.findMany({
      where,
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { spentAt: 'desc' },
      take: limit,
    });
  }

  async createExpense(data: any, createdById?: string) {
    const description = String(data?.description || '').trim();
    if (description.length < 2 || description.length > 200) {
      throw new BadRequestException('Descripción inválida');
    }
    const amount = Math.round(Number(data?.amount));
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new BadRequestException('Monto inválido');
    }
    let spentAt = new Date();
    if (data?.spentAt) {
      spentAt = new Date(data.spentAt);
      if (isNaN(spentAt.getTime())) throw new BadRequestException('Fecha inválida');
    }
    let categoryId: string | null = data?.categoryId ? String(data.categoryId) : null;
    if (categoryId) {
      const cat = await this.prisma.expenseCategory.findUnique({ where: { id: categoryId } });
      if (!cat || !cat.isActive) throw new BadRequestException('Categoría inválida');
    }
    return this.prisma.expense.create({
      data: {
        description,
        amount,
        spentAt,
        notes: String(data?.notes || '').trim() || null,
        categoryId,
        createdById: createdById || null,
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async deleteExpense(id: string) {
    const found = await this.prisma.expense.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Gasto no encontrado');
    await this.prisma.expense.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ── P&L ─────────────────────────────────────────────────────
  // ingresos − COGS (órdenes PAID/DELIVERED) − compras stock − gastos = utilidad neta
  async summary(query: any = {}) {
    const to = query.to ? rangeBound(query.to, true) : new Date();
    const from = query.from ? rangeBound(query.from, false) : new Date(to);
    if (!query.from) from.setMonth(from.getMonth() - 1);

    const paidWhere: any = {
      status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
      createdAt: { gte: from, lte: to },
    };

    const [sales, purchases, expenses, byCategory] = await Promise.all([
      this.prisma.order.aggregate({
        where: paidWhere,
        _sum: { total: true, profit: true, totalCost: true },
        _count: true,
      }),
      this.prisma.purchase.aggregate({
        where: {
          createdAt: { gte: from, lte: to },
          status: { in: ['CONFIRMED', 'RECEIVING', 'RECEIVED'] as any },
        },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { spentAt: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { spentAt: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const ingresos = sales._sum.total || 0;
    const cogs = sales._sum.totalCost || 0;
    const margenBruto = sales._sum.profit || 0;
    const comprasStock = purchases._sum.total || 0;
    const gastosOp = expenses._sum.amount || 0;
    const utilidadNeta = margenBruto - gastosOp;

    const catIds = byCategory.map((b: any) => b.categoryId).filter(Boolean);
    const cats = catIds.length
      ? await this.prisma.expenseCategory.findMany({ where: { id: { in: catIds } } })
      : [];
    const catMap = new Map(cats.map((c: any) => [c.id, c]));

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
      ingresos,
      cogs,
      margenBruto,
      margenBrutoPct: ingresos > 0 ? Math.round(((margenBruto / ingresos) * 100) * 10) / 10 : 0,
      comprasStock,
      comprasCount: purchases._count,
      gastosOp,
      gastosCount: expenses._count,
      utilidadNeta,
      utilidadPct: ingresos > 0 ? Math.round(((utilidadNeta / ingresos) * 100) * 10) / 10 : 0,
      ordenes: sales._count,
      porCategoria: byCategory.map((b: any) => ({
        categoryId: b.categoryId,
        name: catMap.get(b.categoryId)?.name ?? 'Sin categoría',
        color: catMap.get(b.categoryId)?.color ?? '#64748b',
        total: b._sum.amount || 0,
        count: b._count,
      })),
    };
  }
}
