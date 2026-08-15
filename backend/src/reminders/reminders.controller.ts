import { Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
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
  async create(@Req() req: Request) {
    const data = await readJsonBody(req);
    return this.remindersService.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Req() req: Request) {
    const data = await readJsonBody(req);
    return this.remindersService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.remindersService.delete(id);
  }
}
