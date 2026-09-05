import { Module } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleAuthController } from './google-auth.controller';

@Module({
  controllers: [GoogleAuthController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleModule {}
