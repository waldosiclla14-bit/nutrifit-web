import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { FinancesService } from './finances.service';

@Controller('finances')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class FinancesController {
  constructor(private finances: FinancesService) {}

  @Get('summary')
  summary(@Query() query: any) {
    return this.finances.summary(query);
  }

  @Get('categories')
  categories(@Query() query: any) {
    return this.finances.listCategories(query.all === 'true');
  }

  @Post('categories')
  async createCategory(@Request() req: any) {
    const body = await readJsonBody(req);
    return this.finances.createCategory(body);
  }

  @Get('expenses')
  expenses(@Query() query: any) {
    return this.finances.listExpenses(query);
  }

  @Post('expenses')
  async createExpense(@Request() req: any) {
    const body = await readJsonBody(req);
    return this.finances.createExpense(body, req.user.id);
  }

  @Delete('expenses/:id')
  deleteExpense(@Param('id') id: string) {
    return this.finances.deleteExpense(id);
  }
}
