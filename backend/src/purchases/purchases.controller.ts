import { Controller, Get, Post, Body, Param, Delete, Query, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
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

@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Post('batch')
  async createBatch(@Body() data: {
    items: Array<{ productId: string; variantId?: string; quantity: number; unitCost: number; photoUrl?: string; notes?: string }>;
    supplier?: string;
    referenceNumber?: string;
    documentUrl?: string;
  }) {
    return this.purchasesService.createBatch(data);
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