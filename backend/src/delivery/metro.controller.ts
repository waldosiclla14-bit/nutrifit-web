import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { MetroService } from './metro.service';

@Controller('metro-stations')
export class MetroController {
  constructor(private metroService: MetroService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.metroService.findAll(query);
  }

  @Get('lines')
  getLines() {
    return this.metroService.getLines();
  }

  @Get('communes')
  getCommunes() {
    return this.metroService.getCommunes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.metroService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Query() data: any) {
    return this.metroService.update(id, data);
  }
}
