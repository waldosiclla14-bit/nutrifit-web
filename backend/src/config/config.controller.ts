import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
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
  setGoals(@Body() body: any) {
    return this.configService.setGoals(body);
  }
}
