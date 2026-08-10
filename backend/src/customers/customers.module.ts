import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, RolesGuard],
})
export class CustomersModule {}
