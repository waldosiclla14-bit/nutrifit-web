import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PushWebhookController } from './push-webhook.controller';
import { PushService } from './push.service';

/**
 * Prueba de integración del webhook de pedidos.
 *
 * El bug original: el endpoint vivía dentro de `PushController`, que tiene
 * `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel de clase, y `@UseGuards()`
 * vacío no los anula. El frontend solo manda `x-webhook-secret`, así que
 * recibía 401 siempre y ninguna notificación de pedido se enviaba.
 *
 * Aquí se levanta un servidor real y se comprueba que responde sin JWT.
 */
describe('PushWebhookController', () => {
  let app: INestApplication;
  let push: { procesarEventoPedido: jest.Mock };
  let base: string;
  const OLD_ENV = process.env;

  beforeAll(async () => {
    process.env = { ...OLD_ENV, WEBHOOK_SECRET: 'secreto' };
    push = { procesarEventoPedido: jest.fn().mockResolvedValue({ enviado: true }) };

    const moduleRef = await Test.createTestingModule({
      controllers: [PushWebhookController],
      providers: [{ provide: PushService, useValue: push }],
    }).compile();

    app = moduleRef.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix('api');
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1').replace(/\/$/, '');
  });

  afterAll(async () => {
    await app.close();
    process.env = OLD_ENV;
  });

  beforeEach(() => {
    push.procesarEventoPedido.mockClear();
  });

  it('acepta el evento sin sesión y pasa el secreto al servicio', async () => {
    const res = await fetch(`${base}/api/push/evento`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-secret': 'secreto' },
      body: JSON.stringify({ tipo: 'nueva_venta', referencia: 'NF-1' }),
    });

    expect(res.status).toBe(201);
    expect(push.procesarEventoPedido).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'nueva_venta', referencia: 'NF-1' }),
      'secreto',
    );
  });

  it('el controlador no declara guards (no exige JWT)', () => {
    const guards = Reflect.getMetadata('__guards__', PushWebhookController);
    expect(guards).toBeUndefined();
  });
});
