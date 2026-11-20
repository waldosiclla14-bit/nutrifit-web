import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiUsageService } from './ai-usage.service';
import { ProductDraftController } from './product-draft.controller';
import { ProductDraftService } from './product-draft.service';

@Module({
  imports: [ProductsModule],
  controllers: [AiController, ProductDraftController],
  providers: [AiService, AiUsageService, ProductDraftService],
  exports: [AiService],
})
export class AiModule {}
