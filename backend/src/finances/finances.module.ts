import { Module } from '@nestjs/common';
import { FinancesService } from './finances.service';
import { FinancesController } from './finances.controller';
import { LogisticsModule } from '../logistics/logistics.module';

@Module({
  imports: [LogisticsModule],
  controllers: [FinancesController],
  providers: [FinancesService],
  exports: [FinancesService],
})
export class FinancesModule {}
