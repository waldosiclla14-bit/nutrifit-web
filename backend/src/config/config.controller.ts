import { Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { ConfigService } from './config.service';

@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Get('goals')
  getGoals() {
    return this.configService.getGoals();
  }

  @Put('goals')
  async setGoals(@Req() req: Request) {
    const body = await readJsonBody(req);
    return this.configService.setGoals(body);
  }
}
