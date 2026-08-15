import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ProbeResult {
  result?: unknown;
  ms?: number;
  err?: string;
}

@Controller('ping')
export class PingController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async ping() {
    const db = await this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    return { ok: true, db: db?.[0]?.ok ?? null, time: new Date().toISOString() };
  }

  @Get('db')
  async db() {
    const out: Record<string, ProbeResult> = {};

    const t0 = Date.now();
    try {
      const r = await this.prisma.coupon.findUnique({ where: { code: 'NF-TEST' } });
      out.couponFindUnique = { result: r ? 'found' : 'not-found', ms: Date.now() - t0 };
    } catch (e) {
      out.couponFindUnique = { err: (e as Error).message, ms: Date.now() - t0 };
    }

    const t1 = Date.now();
    try {
      const r = await this.prisma.coupon.count();
      out.couponCount = { result: r, ms: Date.now() - t1 };
    } catch (e) {
      out.couponCount = { err: (e as Error).message, ms: Date.now() - t1 };
    }

    const t2 = Date.now();
    try {
      const r = await this.prisma.order.count();
      out.orderCount = { result: r, ms: Date.now() - t2 };
    } catch (e) {
      out.orderCount = { err: (e as Error).message, ms: Date.now() - t2 };
    }

    return out;
  }
}
