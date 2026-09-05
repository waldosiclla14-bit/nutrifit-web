import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetroService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { line?: string; commune?: string; search?: string; active?: boolean }) {
    const where: any = {};

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      where.active = true;
    }

    if (query.line) {
      where.line = query.line;
    }

    if (query.commune) {
      where.commune = { contains: query.commune, mode: 'insensitive' };
    }

    if (query.search) {
      const term = query.search
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      where.OR = [
        { normalizedName: { contains: term, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { line: { contains: query.search, mode: 'insensitive' } },
        { lineName: { contains: query.search, mode: 'insensitive' } },
        { commune: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.metroStation.findMany({
      where,
      orderBy: [{ line: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findOne(id: string) {
    return this.prisma.metroStation.findUnique({ where: { id } });
  }

  async findEnabled() {
    return this.prisma.metroStation.findMany({
      where: { active: true, deliveryEnabled: true },
      orderBy: [{ line: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async getLines() {
    const lines = await this.prisma.metroStation.groupBy({
      by: ['line', 'lineName'],
      where: { active: true },
      _count: { id: true },
      orderBy: { line: 'asc' },
    });
    return lines.map((l) => ({
      line: l.line,
      lineName: l.lineName,
      count: l._count.id,
    }));
  }

  async getCommunes() {
    const communes = await this.prisma.metroStation.groupBy({
      by: ['commune'],
      where: { active: true },
      _count: { id: true },
      orderBy: { commune: 'asc' },
    });
    return communes.map((c) => ({
      commune: c.commune,
      count: c._count.id,
    }));
  }

  async update(id: string, data: any) {
    return this.prisma.metroStation.update({ where: { id }, data });
  }
}
