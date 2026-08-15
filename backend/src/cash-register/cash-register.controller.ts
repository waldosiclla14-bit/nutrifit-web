import { Controller, Get, Post, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { CashRegisterService } from './cash-register.service';

@Controller('cash-register')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SELLER)
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
  async open(@Request() req: any) {
    const body = await readJsonBody(req);
    return this.cashService.open({ openedById: req.user.id, initialAmount: body.initialAmount });
  }

  @Patch(':id/close')
  async close(@Param('id') id: string, @Request() req: any) {
    const body = await readJsonBody(req);
    return this.cashService.close(id, { finalAmount: body.finalAmount, closedById: req.user.id });
  }

  @Post('movement')
  async addMovement(@Request() req: any) {
    const body = await readJsonBody(req);
    return this.cashService.addMovement({ ...body, createdById: req.user.id });
  }
}
