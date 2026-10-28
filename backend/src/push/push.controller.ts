import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { PushService } from './push.service';

@Controller('push')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PushController {
  constructor(private push: PushService) {}

  @Get('vapid-key')
  @Roles(Role.ADMIN, Role.SELLER, Role.DELIVERY)
  vapidKey() {
    return this.push.getPublicKey();
  }

  @Post('subscribe')
  @Roles(Role.ADMIN, Role.SELLER, Role.DELIVERY)
  async subscribe(@Request() req: any) {
    const body = await readJsonBody(req);
    return this.push.subscribe(body, req.user?.id);
  }

  @Post('unsubscribe')
  @Roles(Role.ADMIN, Role.SELLER, Role.DELIVERY)
  async unsubscribe(@Request() req: any) {
    const body = await readJsonBody(req);
    return this.push.unsubscribe(body?.endpoint);
  }

  // Prueba: se envía a sí mismo
  @Post('test')
  @Roles(Role.ADMIN, Role.SELLER, Role.DELIVERY)
  async test(@Request() req: any) {
    return this.push.sendToUser(req.user?.id, {
      title: 'NutriFit OS',
      body: 'Notificaciones activadas en este dispositivo ✅',
      url: '/admin',
    });
  }

  // Difusión a todos los dispositivos (solo ADMIN)
  @Post('broadcast')
  @Roles(Role.ADMIN)
  async broadcast(@Request() req: any) {
    const body = await readJsonBody(req);
    return this.push.broadcast({
      title: String(body?.title || 'NutriFit OS'),
      body: String(body?.body || ''),
      url: String(body?.url || '/admin'),
    });
  }
}
