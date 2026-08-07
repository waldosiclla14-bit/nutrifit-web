import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.customersService.findAll();
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  findByPhone(@Query('phone') phone: string) {
    return this.customersService.findByPhone(phone);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.customersService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() data: any) {
    return this.customersService.update(id, data);
  }
}
