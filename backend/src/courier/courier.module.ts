import { Module } from '@nestjs/common';
import { DeliveryModule } from '../delivery/delivery.module';
import { RolesGuard } from '../auth/roles.guard';
import { CourierController } from './courier.controller';
import { CourierAdminController } from './courier-admin.controller';
import { CourierService } from './courier.service';

@Module({
  imports: [DeliveryModule],
  controllers: [CourierController, CourierAdminController],
  providers: [CourierService, RolesGuard],
})
export class CourierModule {}
