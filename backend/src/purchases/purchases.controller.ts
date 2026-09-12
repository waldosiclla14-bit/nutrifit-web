import { Controller, Get, Post, Body, Param, Delete, Query, Patch } from '@nestjs/common';
import { PurchasesService } from './purchases.service';

type PurchaseForm = {
  productId: string;
  variantId?: string;
  quantity: number;
  unitCost: number;
  supplier?: string;
  referenceNumber?: string;
  notes?: string;
};

type PurchaseResponse = {
  id: string;
  productId: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  referenceNumber?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  date: string;
  createdAt: string;
};

type MovementResponse = {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  referenceId?: string;
  referenceType?: string;
  reason?: string;
  createdAt: string;
};

@Controller('admin/purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.purchasesService.findAll(query);
  }

  @Get('options')
  async getOptions() {
    return this.purchasesService.getProductOptions();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Post()
  async create(@Body() data: PurchaseForm) {
    return this.purchasesService.create(data);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
  ) {
    return this.purchasesService.updateStatus(id, status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.purchasesService.delete(id);
  }
}