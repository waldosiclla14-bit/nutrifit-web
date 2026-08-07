import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CashRegisterService } from './cash-register.service';

@Controller('cash-register')
@UseGuards(JwtAuthGuard)
export class CashRegisterController {
  constructor(private cashService: CashRegisterService) {}

  @Get('current')
  getCurrent() {
    return this.cashService.getCurrent();
  }

  @Get('history')
  getHistory() {
    return this.cashService.getHistory();
  }

  @Post('open')
  open(@Body() body: { initialAmount: number }, @Request() req: any) {
    return this.cashService.open({ openedById: req.user.id, initialAmount: body.initialAmount });
  }

  @Patch(':id/close')
  close(@Param('id') id: string, @Body() body: { finalAmount: number }, @Request() req: any) {
    return this.cashService.close(id, { finalAmount: body.finalAmount, closedById: req.user.id });
  }

  @Post('movement')
  addMovement(@Body() body: any, @Request() req: any) {
    return this.cashService.addMovement({ ...body, createdById: req.user.id });
  }
}
