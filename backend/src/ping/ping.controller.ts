import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';

@Controller('ping')
export class PingController {
  constructor(private prisma: PrismaService, private coupons: CouponsService) {}

  @Get()
  async ping() {
    const db = await this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    return { ok: true, db: db?.[0]?.ok ?? null, time: new Date().toISOString() };
  }

  @Get('diag')
  async diag() {
    const out: any = { time: new Date().toISOString() };
    const run = async (label: string, fn: () => Promise<any>) => {
      const t0 = Date.now();
      try {
        const r = await Promise.race([
          fn(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT 6000ms')), 6000)),
        ]);
        out[label] = `OK ${Date.now() - t0}ms` + (Array.isArray(r) ? ` (${r.length} rows)` : '');
      } catch (e: any) {
        out[label] = `ERR ${Date.now() - t0}ms: ${String(e?.message || e).slice(0, 300)}`;
      }
    };
    await run('raw', () => this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`);
    await run('user.findUniqueEmail', () =>
      this.prisma.user.findUnique({ where: { email: 'x@x.cl' } }),
    );
    await run('user.findFirst', () => this.prisma.user.findFirst({ select: { id: true } }));
    await run('customer.findMany', () => this.prisma.customer.findMany({ take: 1 }));
    await run('customer.findUnique', () =>
      this.prisma.customer.findUnique({ where: { id: 'nope' } }),
    );
    await run('config.findUnique', () =>
      this.prisma.config.findUnique({ where: { key: 'sales_goals' } }),
    );
    await run('coupon.findUnique', () =>
      this.prisma.coupon.findUnique({ where: { code: 'NF-TEST-0000-XXXX' } }),
    );
    await run('coupon.findMany', () => this.prisma.coupon.findMany({ take: 1 }));
    await run('couponValidateSvc', () =>
      this.coupons.validateCoupon({ code: 'NF-TEST-0000-XXXX', phone: '9999999999', subtotal: 10000 }),
    );
    await run('txCount', () => this.prisma.$transaction(async (tx) => tx.customer.count()));
    await run('url', async () => (process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':***@'));
    return out;
  }
}
