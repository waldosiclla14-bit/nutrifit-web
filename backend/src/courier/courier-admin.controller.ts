import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { CourierService } from './courier.service';

/**
 * Revisión de las rendiciones del repartidor. Es control de efectivo propio,
 * NO el cierre de caja del POS: aquí nunca se escribe en cash_registers.
 */
@Controller('courier/rendiciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SELLER)
export class CourierAdminController {
  constructor(private courierService: CourierService) {}

  @Get()
  list(@Query('day') day?: string, @Query('status') status?: string) {
    return this.courierService.listRendiciones({ day, status });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.courierService.getRendicionAdmin(id);
  }

  @Get(':id/proof/:deliveryId')
  proof(@Param('id') id: string, @Param('deliveryId') deliveryId: string) {
    return this.courierService.getProof(id, deliveryId);
  }

  @Post(':id/confirm')
  async confirm(@Req() req: any, @Param('id') id: string) {
    const body = await readJsonBody(req);
    return this.courierService.confirmRendicion(id, body, req.user?.id);
  }
}
