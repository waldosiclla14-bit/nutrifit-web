import { Controller, Get, Post, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { JsonBody } from '../common/decorators/raw-body.decorator';
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
  open(@JsonBody() body: { initialAmount: number }, @Request() req: any) {
    return this.cashService.open({ openedById: req.user.id, initialAmount: body.initialAmount });
  }

  @Patch(':id/close')
  close(@Param('id') id: string, @JsonBody() body: { finalAmount: number }, @Request() req: any) {
    return this.cashService.close(id, { finalAmount: body.finalAmount, closedById: req.user.id });
  }

  @Post('movement')
  addMovement(@JsonBody() body: any, @Request() req: any) {
    return this.cashService.addMovement({ ...body, createdById: req.user.id });
  }
}
