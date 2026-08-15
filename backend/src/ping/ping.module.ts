import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CouponsModule } from '../coupons/coupons.module';
import { PingController } from './ping.controller';

@Module({
  imports: [PrismaModule, CouponsModule],
  controllers: [PingController],
})
export class PingModule {}
