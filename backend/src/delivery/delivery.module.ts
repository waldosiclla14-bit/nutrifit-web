import { Module } from '@nestjs/common';
import { MetroService } from './metro.service';
import { MetroController } from './metro.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { DeliverySeedService } from './delivery-seed.service';
import { NotificationService } from './notification.service';
import { GoogleModule } from '../google/google.module';

@Module({
  imports: [GoogleModule],
  controllers: [MetroController, DeliveryController],
  providers: [MetroService, DeliveryService, DeliverySeedService, NotificationService],
  exports: [MetroService, DeliveryService, NotificationService],
})
export class DeliveryModule {}
