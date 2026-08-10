import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, RolesGuard],
})
export class OrdersModule {}
