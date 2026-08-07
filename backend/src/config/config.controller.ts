import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfigService } from './config.service';

@Controller('config')
@UseGuards(JwtAuthGuard)
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
