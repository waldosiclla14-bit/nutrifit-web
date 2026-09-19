import { Controller, Post, Get, Query, UseGuards, Request } from '@nestjs/common';
import { StockAdjustmentService } from './stock-adjustment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { readJsonBody } from '../common/decorators/raw-body.decorator';

@Controller('stock-adjustments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockAdjustmentController {
  constructor(private readonly service: StockAdjustmentService) {}

  @Post()
  @Roles('ADMIN')
  async applyBulk(@Request() req: any) {
    const body: {
      adjustments: {
        productId: string;
        variantId?: string;
        quantityDelta: number;
        reason: string;
        notes?: string;
      }[];
    } = await readJsonBody(req);
    return this.service.applyBulk(body.adjustments);
  }

  @Get()
  @Roles('ADMIN')
  findAll(
    @Query('productId') productId?: string,
    @Query('reason') reason?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll({ productId, reason, from, to });
  }
}
