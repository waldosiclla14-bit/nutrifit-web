import { Module } from '@nestjs/common';
import { StockAdjustmentService } from './stock-adjustment.service';
import { StockAdjustmentController } from './stock-adjustment.controller';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [StockAdjustmentController, SuppliersController],
  providers: [StockAdjustmentService, SuppliersService, PrismaService],
  exports: [StockAdjustmentService, SuppliersService],
})
export class InventoryModule {}
