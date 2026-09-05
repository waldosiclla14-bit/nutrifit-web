import { Controller, Get, Post, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, DeliveryStatus } from '@prisma/client';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { DeliveryService } from './delivery.service';

@Controller('deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SELLER)
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.deliveryService.findAll(query);
  }

  @Get('stats')
  getStats(@Query() query: any) {
    return this.deliveryService.getStats(query);
  }

  @Get('slots')
  getSlots(@Query('date') date: string, @Query('stationId') stationId?: string) {
    return this.deliveryService.getSlots(date, stationId);
  }

  @Get('order/:orderId')
  findByOrder(@Param('orderId') orderId: string) {
    return this.deliveryService.findByOrder(orderId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveryService.findOne(id);
  }

  @Post()
  async create(@Request() req: any) {
    const body = await readJsonBody(req);
    return this.deliveryService.create(body);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Request() req: any) {
    const body = await readJsonBody(req);
    return this.deliveryService.updateStatus(id, body.status as DeliveryStatus, req.user?.id);
  }

  @Patch(':id/assign')
  async assign(@Param('id') id: string, @Request() req: any) {
    const body = await readJsonBody(req);
    return this.deliveryService.assign(id, body.userId);
  }

  @Patch(':id/reschedule')
  async reschedule(@Param('id') id: string, @Request() req: any) {
    const body = await readJsonBody(req);
    return this.deliveryService.reschedule(id, body);
  }

  @Patch(':id/verify-code')
  async verifyCode(@Param('id') id: string, @Request() req: any) {
    const body = await readJsonBody(req);
    return this.deliveryService.verifyCode(id, body.code);
  }
}
