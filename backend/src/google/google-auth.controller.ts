import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('google')
export class GoogleAuthController {
  constructor(private googleCalendar: GoogleCalendarService) {}

  @Get('calendar/auth-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getAuthUrl() {
    if (!this.googleCalendar.isReady()) {
      return { configured: false, url: null };
    }
    const url = this.googleCalendar.getAuthUrl('admin');
    return { configured: true, url };
  }

  @Get('calendar/callback')
  async handleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    if (!code) {
      return res.redirect('/admin?google=error');
    }

    try {
      await this.googleCalendar.setCredentials(code);
      return res.redirect('/admin?google=connected');
    } catch (error) {
      return res.redirect('/admin?google=error');
    }
  }

  @Get('calendar/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getStatus() {
    return { configured: this.googleCalendar.isReady() };
  }

  @Get('calendar/today')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getTodayEvents() {
    return this.googleCalendar.getTodayEvents();
  }
}
