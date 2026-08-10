import { Module } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { RolesGuard } from '../auth/roles.guard';
import { CashRegisterController } from './cash-register.controller';

@Module({
  controllers: [CashRegisterController],
  providers: [CashRegisterService, RolesGuard],
})
export class CashRegisterModule {}
