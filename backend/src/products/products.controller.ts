import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Get('featured')
  findFeatured() {
    return this.productsService.findAll({ featured: true });
  }

  @Get('low-stock')
  @UseGuards(JwtAuthGuard)
  getLowStock() {
    return this.productsService.getLowStock();
  }

  @Get('sku/:sku')
  findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOne(idOrSlug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() data: any) {
    // Crear producto con variantes
    return data;
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard)
  updateStock(@Param('id') id: string, @Body() body: { quantity: number }) {
    return this.productsService.updateStock(id, body.quantity);
  }

  @Patch(':id/price')
  @UseGuards(JwtAuthGuard)
  updatePrice(@Param('id') id: string, @Body() body: { price: number }) {
    return this.productsService.updatePrice(id, body.price);
  }
}
