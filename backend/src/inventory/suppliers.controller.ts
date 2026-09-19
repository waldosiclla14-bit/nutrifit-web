import { Controller, Get, Post, Put, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { readJsonBody } from '../common/decorators/raw-body.decorator';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  async create(@Request() req: any) {
    const body: { name: string; contactInfo?: string; paymentTerms?: string } = await readJsonBody(req);
    return this.service.create(body);
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Request() req: any) {
    const body: { name?: string; contactInfo?: string; paymentTerms?: string; isActive?: boolean } = await readJsonBody(req);
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
