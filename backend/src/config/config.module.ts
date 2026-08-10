import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  controllers: [ConfigController],
  providers: [ConfigService, RolesGuard],
  exports: [ConfigService],
})
export class ConfigModule {}
