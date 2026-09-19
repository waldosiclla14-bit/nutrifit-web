import { Controller, Get, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { MetroService } from './metro.service';
import { readJsonBody } from '../common/decorators/raw-body.decorator';

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
  async update(@Param('id') id: string, @Request() req: any) {
    const data: any = await readJsonBody(req);
    return this.metroService.update(id, data);
  }
}
