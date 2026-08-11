import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { RolesGuard } from '../auth/roles.guard';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [CouponsModule],
  controllers: [OrdersController],
  providers: [OrdersService, RolesGuard],
})
export class OrdersModule {}
