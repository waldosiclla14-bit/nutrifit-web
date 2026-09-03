import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { RolesGuard } from '../auth/roles.guard';
import { CouponsModule } from '../coupons/coupons.module';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [CouponsModule, RemindersModule],
  controllers: [OrdersController],
  providers: [OrdersService, RolesGuard],
})
export class OrdersModule {}
