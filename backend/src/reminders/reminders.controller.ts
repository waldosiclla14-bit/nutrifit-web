import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RemindersService } from './reminders.service';

@Controller('reminders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SELLER)
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.remindersService.findAll(status);
  }

  @Post()
  create(@Body() data: any) {
    return this.remindersService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.remindersService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.remindersService.delete(id);
  }
}
