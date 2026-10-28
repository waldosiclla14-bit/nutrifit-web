import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { PushController } from './push.controller';
import { PushWebhookController } from './push-webhook.controller';

@Module({
  controllers: [PushController, PushWebhookController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
