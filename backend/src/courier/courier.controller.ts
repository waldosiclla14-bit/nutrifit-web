import { Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { CourierService } from './courier.service';

/**
 * API exclusiva del repartidor. Todo se acota a `assignedTo = req.user.id` en
 * el servidor: el cliente no puede pedir "las entregas de otro".
 */
@Controller('courier')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DELIVERY, Role.ADMIN)
export class CourierController {
  constructor(private courierService: CourierService) {}

  @Get('config')
  getConfig() {
    return this.courierService.getConfig();
  }

  @Get('route')
  getRoute(@Req() req: any, @Query('day') day?: string) {
    return this.courierService.getRoute(req.user.id, day);
  }

  @Get('route/:id')
  getDelivery(@Req() req: any, @Param('id') id: string) {
    return this.courierService.getDelivery(req.user.id, id);
  }

  @Patch('route/:id/status')
  async updateStatus(@Req() req: any, @Param('id') id: string) {
    const body = await readJsonBody(req);
    return this.courierService.updateStatus(req.user.id, id, body?.status, body?.reason, body?.idempotencyKey);
  }

  /** Cierre con prueba de entrega y cobro. Reemplaza al PATCH a DELIVERED. */
  @Post('route/:id/deliver')
  async deliver(@Req() req: any, @Param('id') id: string) {
    const body = await readJsonBody(req);
    return this.courierService.deliver(req.user.id, id, body);
  }

  @Post('route/:id/reschedule')
  async requestReschedule(@Req() req: any, @Param('id') id: string) {
    const body = await readJsonBody(req);
    return this.courierService.requestReschedule(req.user.id, id, body?.reason, body?.idempotencyKey);
  }

  @Get('rendicion')
  getRendicion(@Req() req: any, @Query('day') day?: string) {
    return this.courierService.getRendicion(req.user.id, day);
  }

  @Post('rendicion/cerrar')
  async closeRendicion(@Req() req: any) {
    const body = await readJsonBody(req);
    return this.courierService.closeRendicion(req.user.id, body, body?.day);
  }
}
