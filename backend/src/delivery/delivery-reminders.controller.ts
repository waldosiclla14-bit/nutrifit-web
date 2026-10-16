import { Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { DeliveryService } from './delivery.service';

// Endpoint para cron externo (cron-job.org). SIN guards JWT: se autoriza con
// secreto compartido (header x-cron-secret vs env CRON_SECRET), porque un
// cron no puede hacer login. Configurar CRON_SECRET en el servidor o este
// endpoint responde 401 siempre.
@Controller('deliveries/reminders')
export class DeliveryRemindersController {
  constructor(private deliveries: DeliveryService) {}

  @Post('dispatch')
  async dispatch(@Req() req: any) {
    const secret = String(req.headers?.['x-cron-secret'] || '');
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      throw new UnauthorizedException('Cron no autorizado');
    }
    const body = await readJsonBody(req).catch(() => ({}));
    const minutes = Math.min(240, Math.max(5, Math.round(Number(body?.minutes) || 60)));
    return this.deliveries.dispatchReminders(minutes);
  }
}
