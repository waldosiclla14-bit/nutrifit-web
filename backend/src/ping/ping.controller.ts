import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ProbeResult {
  result?: unknown;
  ms?: number;
  err?: string;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<ProbeResult> {
  const t0 = Date.now();
  let settled = false;
  const r = Promise.race([
    p.then((v): ProbeResult => ({ result: v, ms: Date.now() - t0 })),
    new Promise<ProbeResult>((resolve) =>
      setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({ err: 'timeout', ms: Date.now() - t0 });
      }, ms),
    ),
  ]);
  // mark settled when p resolves
  p.then(() => {
    settled = true;
  });
  return r;
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

    out.pingRaw = await withTimeout(
      this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`,
      6000,
    ).catch((e) => ({ err: (e as Error).message }));

    out.productsCount = await withTimeout(this.prisma.product.count(), 6000).catch((e) => ({
      err: (e as Error).message,
    }));

    out.orderCount = await withTimeout(this.prisma.order.count(), 6000).catch((e) => ({
      err: (e as Error).message,
    }));

    out.couponFindUnique = await withTimeout(
      this.prisma.coupon.findUnique({ where: { code: 'NF-TEST' } }),
      6000,
    ).catch((e) => ({ err: (e as Error).message }));

    out.couponCount = await withTimeout(this.prisma.coupon.count(), 6000).catch((e) => ({
      err: (e as Error).message,
    }));

    return out;
  }
}
