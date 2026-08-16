import { Controller, Get, Post, Patch, Delete, Param, Query, Req, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.productsService.toPublicProducts(await this.productsService.findAll(query));
  }

  @Get('internal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  findAllInternal(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Get('featured')
  async findFeatured() {
    return this.productsService.toPublicProducts(
      await this.productsService.findAll({ featured: true }),
    );
  }

  @Get('low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  getLowStock() {
    return this.productsService.getLowStock();
  }

  @Get('inventory-value')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  getInventoryValue() {
    return this.productsService.getInventoryValue();
  }

  @Get('sku/:sku')
  async findBySku(@Param('sku') sku: string) {
    return this.productsService.toPublicVariant(await this.productsService.findBySku(sku));
  }

  @Get(':idOrSlug')
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.toPublicProduct(await this.productsService.findOne(idOrSlug));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Req() req: ExpressRequest) {
    const data = await readJsonBody(req);
    return this.productsService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Req() req: ExpressRequest) {
    const data = await readJsonBody(req);
    return this.productsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string, @Request() req: any) {
    return this.productsService.delete(id, req.user?.id);
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  async updateStock(@Param('id') id: string, @Req() req: ExpressRequest) {
    const body = await readJsonBody(req);
    return this.productsService.updateStock(id, body.quantity);
  }

  @Patch(':id/price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  async updatePrice(@Param('id') id: string, @Req() req: ExpressRequest) {
    const body = await readJsonBody(req);
    return this.productsService.updatePrice(id, body.price);
  }

  @Patch(':id/adjust-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  async adjustStock(@Param('id') id: string, @Request() req: any) {
    const body = await readJsonBody(req);
    return this.productsService.adjustStock(id, body.newStock, body.reason, req.user?.id);
  }
}
