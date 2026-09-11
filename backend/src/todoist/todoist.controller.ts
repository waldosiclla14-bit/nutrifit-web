import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { TodoistService } from './todoist.service';

@Controller('todoist')
export class TodoistController {
  constructor(private todoist: TodoistService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getStatus() {
    const check = await this.todoist.checkConnection();
    return { configured: check.ok, mode: this.todoist.getMode(), reason: check.reason };
  }
}
