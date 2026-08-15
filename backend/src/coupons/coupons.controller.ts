import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CouponsService } from './coupons.service';

@Controller('coupons')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @Post('validate')
  async validate(@Body() body: any) {
    const t0 = Date.now();
    try {
      const r = await Promise.race([
        this.couponsService.validateCoupon(body),
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT_5s')), 5000)),
      ]);
      return { _probe: 'ok', ms: Date.now() - t0, data: r };
    } catch (e: any) {
      return { _probe: 'err', ms: Date.now() - t0, message: String(e?.message || e) };
    }
  }

  @Post('ping-post')
  pingPost() {
    return { ok: true, note: 'post-no-body' };
  }

  @Post('ping-body')
  pingBody(@Body() body: any) {
    return { ok: true, body };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  generate(@Body() body: any) {
    return this.couponsService.generateForCustomer(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  list() {
    return [];
  }
}
