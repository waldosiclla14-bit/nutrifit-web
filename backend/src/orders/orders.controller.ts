import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() query: any) {
    return this.ordersService.findAll(query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats() {
    return this.ordersService.getStats();
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard)
  getReports(@Query() query: any) {
    return this.ordersService.getReports(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  create(@Body() data: any, @Request() req: any) {
    if (req.user) data.createdById = req.user.id;
    return this.ordersService.create(data);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(@Param('id') id: string, @Body() body: { status: string }, @Request() req: any) {
    return this.ordersService.updateStatus(id, body.status as any, req.user?.id);
  }

  @Patch(':id/payment')
  @UseGuards(JwtAuthGuard)
  confirmPayment(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.ordersService.confirmPayment(id, body, req.user?.id);
  }
}
