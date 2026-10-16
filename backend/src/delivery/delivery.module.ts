import { Module } from '@nestjs/common';
import { MetroService } from './metro.service';
import { MetroController } from './metro.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryRemindersController } from './delivery-reminders.controller';
import { DeliverySeedService } from './delivery-seed.service';
import { NotificationService } from './notification.service';
import { TodoistModule } from '../todoist/todoist.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [TodoistModule, PushModule],
  controllers: [MetroController, DeliveryController, DeliveryRemindersController],
  providers: [MetroService, DeliveryService, DeliverySeedService, NotificationService],
  exports: [MetroService, DeliveryService, NotificationService],
})
export class DeliveryModule {}
