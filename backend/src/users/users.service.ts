import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
  }

  async create(data: any, actorId?: string) {
    const name = String(data?.name || '').trim();
    if (name.length < 2) throw new BadRequestException('El nombre es obligatorio');

    const email = String(data?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Email inválido');
    }

    const roleRaw = String(data?.role || 'DELIVERY').toUpperCase();
    if (!['ADMIN', 'SELLER', 'DELIVERY'].includes(roleRaw)) {
      throw new BadRequestException('Rol inválido');
    }
    const role = roleRaw as Role;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Ya existe un usuario con ese email');

    const passwordPlain = String(data?.password || '').trim() || crypto.randomBytes(16).toString('hex');
    if (passwordPlain.length < 6) throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    const password = await bcrypt.hash(passwordPlain, 10);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        role,
        password,
        isActive: data?.isActive !== false,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    await this.prisma.auditLog
      .create({
        data: {
          userId: actorId || null,
          action: 'USER_CREATED',
          entity: 'User',
          entityId: user.id,
          newValue: { name: user.name, email: user.email, role: user.role },
        },
      })
      .catch(() => undefined);

    return user;
  }
}
