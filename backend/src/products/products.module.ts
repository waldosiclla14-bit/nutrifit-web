import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, RolesGuard],
})
export class ProductsModule {}
