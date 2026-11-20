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

describe('AuthService — PIN del repartidor', () => {
  let service: AuthService;
  let prisma: any;
  const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

  beforeEach(() => {
    process.env.JWT_SECRET = 'secreto-de-pruebas';
    delete process.env.PIN_LOOKUP_SECRET;
    (bcrypt.compare as jest.Mock).mockReset();
    (bcrypt.hash as jest.Mock).mockReset().mockResolvedValue('pin-hasheado');

    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    service = new AuthService(prisma, { sign: jest.fn().mockReturnValue('jwt') } as any);
    res.cookie.mockReset();
  });

  const courier = {
    id: 'u-rep',
    email: 'repartidor@nutrifit.cl',
    name: 'Repartidor',
    role: 'DELIVERY',
    isActive: true,
    pinHash: 'pin-hasheado',
    pinLookup: 'lookup',
  };

  describe('setPin', () => {
    it('guarda hash y buscador determinista, y audita', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(courier).mockResolvedValueOnce(null);

      await service.setPin('u-rep', '1234');

      const data = prisma.user.update.mock.calls[0][0].data;
      expect(data.pinHash).toBe('pin-hasheado');
      expect(data.pinLookup).toMatch(/^[a-f0-9]{64}$/);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'COURIER_PIN_SET', entity: 'User' }),
      });
    });

    it('rechaza PIN de 3 o 7 dígitos', async () => {
      await expect(service.setPin('u-rep', '123')).rejects.toThrow('4 y 6');
      await expect(service.setPin('u-rep', '1234567')).rejects.toThrow('4 y 6');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('solo aplica a usuarios con rol DELIVERY', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...courier, role: 'SELLER' });

      await expect(service.setPin('u-rep', '1234')).rejects.toThrow('exclusivo del rol Repartidor');
    });

    it('rechaza un PIN ya usado por otro repartidor', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(courier)
        .mockResolvedValueOnce({ ...courier, id: 'u-otro' });

      await expect(service.setPin('u-rep', '1234')).rejects.toThrow('ya está en uso');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('loginWithPin', () => {
    it('emite sesión HttpOnly y audita el acceso', async () => {
      prisma.user.findUnique.mockResolvedValue(courier);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const out = await service.loginWithPin(res, '1234');

      expect(out.user.role).toBe('DELIVERY');
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'jwt', expect.objectContaining({ httpOnly: true }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'COURIER_PIN_LOGIN' }),
      });
    });

    it('rechaza con el mismo mensaje PIN inexistente e incorrecto', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const inexistente = await service.loginWithPin(res, '9999').catch((e) => e.message);

      prisma.user.findUnique.mockResolvedValue(courier);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const incorrecto = await service.loginWithPin(res, '1234').catch((e) => e.message);

      expect(inexistente).toBe('PIN inválido');
      expect(incorrecto).toBe('PIN inválido');
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('no deja entrar a cuentas inactivas ni a otros roles', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...courier, isActive: false });
      await expect(service.loginWithPin(res, '1234')).rejects.toThrow('PIN inválido');

      prisma.user.findUnique.mockResolvedValue({ ...courier, role: 'ADMIN' });
      await expect(service.loginWithPin(res, '1234')).rejects.toThrow('PIN inválido');
    });
  });
});
