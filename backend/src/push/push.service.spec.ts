import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PushService } from './push.service';
import { PrismaService } from '../prisma/prisma.service';
import * as webpush from 'web-push';

jest.mock('web-push', () => ({
  sendNotification: jest.fn(),
}));

describe('PushService', () => {
  let service: PushService;
  let prisma: {
    pushSubscription: {
      findMany: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      delete: jest.Mock;
    };
    notificacionEnviada: { findUnique: jest.Mock; create: jest.Mock; delete: jest.Mock };
    preferenciaNotificacion: { findUnique: jest.Mock };
  };
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      VAPID_PUBLIC_KEY: 'public-test',
      VAPID_PRIVATE_KEY: 'private-test',
    };
    prisma = {
      pushSubscription: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        delete: jest.fn(),
      },
      notificacionEnviada: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
      preferenciaNotificacion: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PushService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PushService>(PushService);
    (webpush.sendNotification as jest.Mock).mockReset();
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  describe('subscribe', () => {
    it('rejects invalid subscriptions', async () => {
      await expect(service.subscribe({ endpoint: 'http://x', keys: { p256dh: 'a', auth: 'b' } })).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.subscribe({ endpoint: 'https://push.example/1', keys: { p256dh: '', auth: 'b' } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('upserts by endpoint', async () => {
      prisma.pushSubscription.upsert.mockResolvedValue({ id: 's1' });
      const res: any = await service.subscribe(
        { endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' }, userAgent: 'test' },
        'u1',
      );
      expect(res).toEqual({ id: 's1' });
      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { endpoint: 'https://push.example/1' } }),
      );
    });
  });

  describe('sendToUser', () => {
    const sub = { id: 's1', endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' };

    it('sends and counts', async () => {
      prisma.pushSubscription.findMany.mockResolvedValue([sub]);
      (webpush.sendNotification as jest.Mock).mockResolvedValue({});

      const res = await service.sendToUser('u1', { title: 'Hola', body: 'Test' });

      expect(res).toEqual({ sent: 1, total: 1 });
      expect(webpush.sendNotification).toHaveBeenCalled();
    });

    it('deletes dead subscriptions (410)', async () => {
      prisma.pushSubscription.findMany.mockResolvedValue([sub]);
      (webpush.sendNotification as jest.Mock).mockRejectedValue(
        Object.assign(new Error('gone'), { statusCode: 410 }),
      );
      prisma.pushSubscription.delete.mockResolvedValue({});

      const res = await service.sendToUser('u1', { title: 'Hola' });

      expect(res).toEqual({ sent: 0, total: 1 });
      expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    });
  });

  describe('vapid', () => {
    it('fails clearly without keys', async () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      expect(() => service.getPublicKey()).toThrow('VAPID');
    });

    it('no revienta el envío cuando faltan las claves', async () => {
      // Antes `vapid()` se llamaba fuera del try y la excepción subía hasta
      // dispatchReminders: el cron de recordatorios respondía 500 y se perdía
      // el lote entero. Ahora es un envío fallido.
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      prisma.pushSubscription.findMany.mockResolvedValue([
        { id: 's1', endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' },
      ]);

      const res = await service.sendToUser('u1', { title: 'Hola' });

      expect(res).toEqual({ sent: 0, total: 1 });
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('broadcast', () => {
    it('solo envía a suscripciones activas', async () => {
      // `broadcast` no filtraba por `activa` y seguía notificando a
      // dispositivos desactivados (los recordatorios usan este método).
      prisma.pushSubscription.findMany.mockResolvedValue([]);

      await service.broadcast({ title: 'Hola' });

      expect(prisma.pushSubscription.findMany).toHaveBeenCalledWith({ where: { activa: true } });
    });
  });

  describe('procesarEventoPedido', () => {
    const evento: any = {
      tipo: 'nueva_venta',
      referencia: 'NF-1',
      pedidoId: 'o1',
      clienteNombre: 'Ana',
      clienteTelefono: '9',
      monto: 1000,
      items: ['x'],
    };

    beforeEach(() => {
      process.env.WEBHOOK_SECRET = 'secreto';
      prisma.notificacionEnviada.findUnique.mockResolvedValue(null);
      prisma.notificacionEnviada.create.mockResolvedValue({});
      prisma.notificacionEnviada.delete.mockResolvedValue({});
    });

    it('libera la marca si no hay suscriptores, para poder reintentar', async () => {
      // Antes la marca quedaba puesta y el aviso se perdía para siempre.
      prisma.pushSubscription.findMany.mockResolvedValue([]);

      const res: any = await service.procesarEventoPedido(evento, 'secreto');

      expect(res).toEqual({ enviado: false, motivo: 'sin_suscriptores' });
      expect(prisma.notificacionEnviada.delete).toHaveBeenCalledWith({
        where: { tipo_referencia: { tipo: 'nueva_venta', referencia: 'NF-1' } },
      });
    });

    it('libera la marca si ningún envío se entrega', async () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      prisma.pushSubscription.findMany.mockResolvedValue([
        { id: 's1', endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a', userId: 'u1' },
      ]);
      prisma.preferenciaNotificacion.findUnique.mockResolvedValue(null);

      const res: any = await service.procesarEventoPedido(evento, 'secreto');

      expect(res.enviado).toBe(false);
      expect(res.motivo).toBe('no_entregado');
      expect(prisma.notificacionEnviada.delete).toHaveBeenCalled();
    });

    it('mantiene la marca cuando sí se entrega', async () => {
      prisma.pushSubscription.findMany.mockResolvedValue([
        { id: 's1', endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a', userId: 'u1' },
      ]);
      prisma.preferenciaNotificacion.findUnique.mockResolvedValue(null);
      (webpush.sendNotification as jest.Mock).mockResolvedValue({});

      const res: any = await service.procesarEventoPedido(evento, 'secreto');

      expect(res.enviado).toBe(true);
      expect(prisma.notificacionEnviada.delete).not.toHaveBeenCalled();
    });

    it('rechaza un secreto inválido', async () => {
      await expect(service.procesarEventoPedido(evento, 'otro')).rejects.toThrow(BadRequestException);
    });
  });
});
