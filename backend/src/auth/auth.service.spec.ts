import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hash-nuevo'),
}));

describe('AuthService — bootstrap', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = { ...OLD_ENV, ADMIN_PASSWORD: 'clave-admin-segura' };
    delete process.env.ENABLE_BOOTSTRAP;

    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u-admin',
          email: 'dueno@nutrifit.cl',
          role: 'ADMIN',
          isActive: true,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('restablece la contraseña de un administrador', async () => {
    const res = await service.bootstrapPassword('clave-admin-segura', 'dueno@nutrifit.cl', 'nueva123', '1.2.3.4');

    expect(res).toEqual({ ok: true, email: 'dueno@nutrifit.cl' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u-admin' },
      data: { password: 'hash-nuevo' },
    });
  });

  it('deja constancia en auditoría con la IP', async () => {
    await service.bootstrapPassword('clave-admin-segura', 'dueno@nutrifit.cl', 'nueva123', '1.2.3.4');

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u-admin',
        action: 'BOOTSTRAP_PASSWORD_RESET',
        entity: 'User',
        entityId: 'u-admin',
        ipAddress: '1.2.3.4',
      }),
    });
  });

  it('no permite restablecer la cuenta de un vendedor', async () => {
    // Antes, quien tuviera ADMIN_PASSWORD podía tomar cualquier cuenta.
    prisma.user.findUnique.mockResolvedValue({
      id: 'u-seller',
      email: 'vendedor@nutrifit.cl',
      role: 'SELLER',
      isActive: true,
    });

    await expect(
      service.bootstrapPassword('clave-admin-segura', 'vendedor@nutrifit.cl', 'nueva123'),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('no distingue entre correo inexistente y cuenta sin permisos', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const inexistente = await service
      .bootstrapPassword('clave-admin-segura', 'nadie@nutrifit.cl', 'nueva123')
      .catch((e) => e.message);

    prisma.user.findUnique.mockResolvedValue({ id: 'u', email: 'x@y.cl', role: 'DELIVERY' });
    const sinPermiso = await service
      .bootstrapPassword('clave-admin-segura', 'x@y.cl', 'nueva123')
      .catch((e) => e.message);

    expect(inexistente).toBe(sinPermiso);
  });

  it('rechaza una clave incorrecta', async () => {
    await expect(
      service.bootstrapPassword('clave-equivocada', 'dueno@nutrifit.cl', 'nueva123'),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('se desactiva por completo con ENABLE_BOOTSTRAP=false', async () => {
    process.env.ENABLE_BOOTSTRAP = 'false';

    await expect(
      service.bootstrapPassword('clave-admin-segura', 'dueno@nutrifit.cl', 'nueva123'),
    ).rejects.toThrow('Bootstrap deshabilitado');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('no falla el reset si la auditoría falla', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('audit caído'));

    const res = await service.bootstrapPassword('clave-admin-segura', 'dueno@nutrifit.cl', 'nueva123');

    expect(res.ok).toBe(true);
    expect(bcrypt.hash).toHaveBeenCalled();
  });
});
