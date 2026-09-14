import { Controller, Get, Post, Body, Param, Query, Patch, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PurchasesService } from './purchases.service';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.purchasesService.findAll(query);
  }

  @Get('stats')
  async getStats() {
    return this.purchasesService.getStats();
  }

  @Get('suppliers')
  async getSuppliers() {
    return this.purchasesService.getSuppliers();
  }

  @Get('check-duplicate')
  async checkDuplicate(
    @Query('supplierId') supplierId: string,
    @Query('documentNumber') documentNumber: string,
    @Query('total') total: string,
  ) {
    const duplicate = await this.purchasesService.checkDuplicate(supplierId, documentNumber, parseInt(total, 10));
    return { duplicate: !!duplicate, existing: duplicate };
  }

  @Get('options')
  async getOptions() {
    return this.purchasesService.getSuppliers();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Get(':id/documents')
  async getDocuments(@Param('id') id: string) {
    return this.purchasesService.getDocuments(id);
  }

  @Get(':id/documents/:docId')
  async getDocumentData(@Param('id') id: string, @Param('docId') docId: string) {
    return this.purchasesService.getDocumentData(id, docId);
  }

  @Get(':id/cost-history')
  async getCostHistory(@Param('id') id: string) {
    return this.purchasesService.getCostHistory(undefined, undefined);
  }

  @Post()
  async create(@Req() req: Request) {
    const body = await readJsonBody(req);
    return this.purchasesService.create(body);
  }

  @Post(':id/documents')
  async addDocument(@Param('id') id: string, @Req() req: Request) {
    const body = await readJsonBody(req);
    return this.purchasesService.addDocument(id, body);
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string, @Req() req: any) {
    return this.purchasesService.confirm(id, req.user?.id);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.purchasesService.cancel(id);
  }

  @Post(':id/receipt')
  async createReceipt(@Param('id') id: string, @Req() req: any) {
    const body = await readJsonBody(req);
    return this.purchasesService.createReceipt(id, body, req.user?.id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Req() req: Request) {
    const body = await readJsonBody(req);
    return this.purchasesService.update(id, body);
  }
}
