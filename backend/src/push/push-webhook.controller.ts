import { Controller, Post, Req } from '@nestjs/common';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { PushService } from './push.service';

/**
 * Webhook de eventos de pedido (frontend → backend).
 *
 * Va en un controlador aparte, sin guards, a propósito. `@UseGuards()` vacío
 * NO quita los guards de clase: dentro de `PushController` la petición seguía
 * pasando por `JwtAuthGuard` y el webhook recibía **401 siempre**, así que
 * ninguna notificación de pedido llegaba a enviarse.
 *
 * La autorización la hace el propio servicio comparando el header
 * `x-webhook-secret` contra `WEBHOOK_SECRET`.
 */
@Controller('push')
export class PushWebhookController {
  constructor(private push: PushService) {}

  @Post('evento')
  async evento(@Req() req: any) {
    const body = await readJsonBody(req);
    const webhookSecret = req.headers?.['x-webhook-secret'] as string;
    return this.push.procesarEventoPedido(body, webhookSecret);
  }
}
