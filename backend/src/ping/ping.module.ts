import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PingController } from './ping.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PingController],
})
export class PingModule {}
