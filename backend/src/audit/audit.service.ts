import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any = {}) {
    const where: any = {};
    if (query.action) where.action = query.action;
    if (query.entity) where.entity = query.entity;
    if (query.userId) where.userId = query.userId;

    return this.prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: query.limit ? parseInt(query.limit) : 100,
    });
  }

  async create(data: any) {
    return this.prisma.auditLog.create({ data });
  }
}
