import { Controller, Get, Post, Patch, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  findAll(@Query() query: any) {
    return this.ordersService.findAll(query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  getStats() {
    return this.ordersService.getStats();
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  getReports(@Query() query: any) {
    return this.ordersService.getReports(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.ordersService.deleteOrder(id);
  }

  @Post()
  async create(@Request() req: any) {
    return this.ordersService.create({ ...(await readJsonBody(req)), createdById: req.user?.id });
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  async updateStatus(@Param('id') id: string, @Request() req: any) {
    const body = await readJsonBody(req);
    return this.ordersService.updateStatus(id, body.status as any, req.user?.id);
  }

  @Patch(':id/payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  async confirmPayment(@Param('id') id: string, @Request() req: any) {
    const body = await readJsonBody(req);
    return this.ordersService.confirmPayment(id, body, req.user?.id);
  }
}
