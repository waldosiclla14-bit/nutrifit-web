import { Module } from '@nestjs/common';
import { MetroService } from './metro.service';
import { MetroController } from './metro.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { DeliverySeedService } from './delivery-seed.service';

@Module({
  controllers: [MetroController, DeliveryController],
  providers: [MetroService, DeliveryService, DeliverySeedService],
  exports: [MetroService, DeliveryService],
})
export class DeliveryModule {}
