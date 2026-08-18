import { Controller, Get, Post, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('product/:productSlug')
  findByProduct(@Param('productSlug') productSlug: string) {
    return this.reviewsService.findByProductSlug(productSlug);
  }

  @Post()
  async create(@Req() req: Request) {
    const body = await readJsonBody(req);
    return this.reviewsService.create(body);
  }
}
