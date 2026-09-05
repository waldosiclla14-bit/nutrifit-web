import { Module } from '@nestjs/common';
import { MetroService } from './metro.service';
import { MetroController } from './metro.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';

@Module({
  controllers: [MetroController, DeliveryController],
  providers: [MetroService, DeliveryService],
  exports: [MetroService, DeliveryService],
})
export class DeliveryModule {}
