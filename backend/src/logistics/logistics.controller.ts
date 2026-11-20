import { Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { LogisticsService } from './logistics.service';

/**
 * Rentabilidad logística y liquidación del repartidor.
 * Los cálculos se hacen siempre en el backend: el navegador solo envía IDs,
 * fechas y datos de pago; nunca importes calculados.
 */
@Controller('logistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class LogisticsController {
  constructor(private logistics: LogisticsService) {}

  @Get('config')
  getConfig() {
    return this.logistics.getConfig();
  }

  @Get('config/history')
  getConfigHistory() {
    return this.logistics.getConfigHistory();
  }

  @Put('config')
  async updateConfig(@Req() req: any) {
    const body = await readJsonBody(req);
    return this.logistics.updateConfig(body, req.user?.id);
  }

  @Get('summary')
  summary(@Query() query: any) {
    return this.logistics.summary(query);
  }

  @Get('entries')
  entries(@Query() query: any) {
    return this.logistics.listEntries(query);
  }

  @Get('couriers')
  couriers() {
    return this.logistics.getCouriers();
  }

  @Get('failed-deliveries')
  failedDeliveries(@Query() query: any) {
    return this.logistics.listFailedDeliveries(query);
  }

  @Post('entries/exceptional')
  async createExceptional(@Req() req: any) {
    const body = await readJsonBody(req);
    return this.logistics.createExceptionalCharge(body, req.user?.id);
  }

  @Patch('entries/:id/exceptional')
  async exceptional(@Param('id') id: string, @Req() req: any) {
    const body = await readJsonBody(req);
    return this.logistics.setExceptionalCharge(id, body, req.user?.id);
  }

  @Get('settlements')
  settlements(@Query() query: any) {
    return this.logistics.listSettlements(query);
  }

  @Post('settlements')
  async createSettlement(@Req() req: any) {
    const body = await readJsonBody(req);
    return this.logistics.createSettlement(body, req.user?.id);
  }

  @Get('settlements/:id')
  settlement(@Param('id') id: string) {
    return this.logistics.getSettlement(id);
  }

  @Patch('settlements/:id/confirm')
  async confirmSettlement(@Param('id') id: string, @Req() req: any) {
    const body = await readJsonBody(req);
    return this.logistics.confirmSettlement(id, body, req.user?.id);
  }

  @Patch('settlements/:id/cancel')
  async cancelSettlement(@Param('id') id: string, @Req() req: any) {
    const body = await readJsonBody(req);
    return this.logistics.cancelSettlement(id, body, req.user?.id);
  }
}
