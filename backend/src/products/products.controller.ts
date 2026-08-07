import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
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

  @Get('inventory-value')
  @UseGuards(JwtAuthGuard)
  getInventoryValue() {
    return this.productsService.getInventoryValue();
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
    return this.productsService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() data: any) {
    return this.productsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string, @Request() req: any) {
    return this.productsService.delete(id, req.user?.id);
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

  @Patch(':id/adjust-stock')
  @UseGuards(JwtAuthGuard)
  adjustStock(@Param('id') id: string, @Body() body: { newStock: number; reason: string }, @Request() req: any) {
    return this.productsService.adjustStock(id, body.newStock, body.reason, req.user?.id);
  }
}
