import { Controller, Get, Post, Req, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { readJsonBody } from '../common/decorators/raw-body.decorator';
import { CouponsService } from '../coupons/coupons.service';

interface ProbeResult {
  result?: unknown;
  ms?: number;
  err?: string;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<ProbeResult> {
  const t0 = Date.now();
  return Promise.race([
    p
      .then(
        (v): ProbeResult => ({ result: v, ms: Date.now() - t0 }),
        (e: Error): ProbeResult => ({ err: e?.message ?? String(e), ms: Date.now() - t0 }),
      )
      .catch(() => ({ err: 'reject', ms: Date.now() - t0 })),
    new Promise<ProbeResult>((resolve) =>
      setTimeout(() => resolve({ err: 'timeout', ms: Date.now() - t0 }), ms),
    ),
  ]);
}

@Controller('ping')
export class PingController {
  constructor(
    private prisma: PrismaService,
    private couponsService: CouponsService,
  ) {}

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

  // readJsonBody + the REAL validateCoupon (rejected-fast if throws, or timeout).
  // validateCoupon with {code,phone:undefined} throws BadRequest BEFORE any DB.
  @Post('probe3')
  async probe3(@Req() req: Request) {
    const out: Record<string, ProbeResult> = {};
    out.readBody = await withTimeout(readJsonBody(req), 6000);
    const body = (out.readBody.result as any) || {};
    out.validateCoupon = await withTimeout(this.couponsService.validateCoupon(body), 6000);
    return out;
  }

  // readJsonBody + a DIRECT BadRequestException throw (no DB, no service).
  // Tests whether Nest's exception RESPONSE after a drained body hangs.
  @Post('probe4')
  async probe4(@Req() req: Request) {
    await readJsonBody(req);
    throw new BadRequestException('probe4: throw after readJsonBody');
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
