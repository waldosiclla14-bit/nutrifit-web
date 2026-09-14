import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PrismaService } from '../prisma/prisma.service';
import { OCRModule } from '../ocr/ocr.module';

@Module({
  imports: [OCRModule],
  controllers: [PurchasesController],
  providers: [PurchasesService, PrismaService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
