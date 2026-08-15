import { Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { readJsonBody } from '../common/decorators/raw-body.decorator';

interface ProbeResult {
  result?: unknown;
  ms?: number;
  err?: string;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<ProbeResult> {
  const t0 = Date.now();
  return Promise.race([
    p.then((v): ProbeResult => ({ result: v, ms: Date.now() - t0 })),
    new Promise<ProbeResult>((resolve) =>
      setTimeout(() => resolve({ err: 'timeout', ms: Date.now() - t0 }), ms),
    ),
  ]);
}

@Controller('ping')
export class PingController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async ping() {
    const db = await this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    return { ok: true, db: db?.[0]?.ok ?? null, time: new Date().toISOString() };
  }

  @Post('probe2')
  async probe2(@Req() req: Request) {
    const t0 = Date.now();
    let body: any = null;
    try {
      body = await readJsonBody(req);
    } catch (e) {
      return { err: (e as Error).message, ms: Date.now() - t0 };
    }
    return { body, ms: Date.now() - t0 };
  }

  @Get('db')
  async db() {
    const out: Record<string, ProbeResult> = {};

    out.pingRaw = await withTimeout(
      this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`,
      6000,
    );

    out.productsCount = await withTimeout(this.prisma.product.count(), 6000);

    out.orderCount = await withTimeout(this.prisma.order.count(), 6000);

    out.couponFindUnique = await withTimeout(
      this.prisma.coupon.findUnique({ where: { code: 'NF-TEST' } }),
      6000,
    );

    out.couponCount = await withTimeout(this.prisma.coupon.count(), 6000);

    return out;
  }
}
