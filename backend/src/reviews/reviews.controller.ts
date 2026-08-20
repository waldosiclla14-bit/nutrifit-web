import { Controller, Get, Post, Param, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async create(@Req() req: Request) {
    const body = await readJsonBody(req);
    return this.reviewsService.create(body);
  }
}
