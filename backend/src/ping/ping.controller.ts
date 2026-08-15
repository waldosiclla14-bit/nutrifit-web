import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ping')
export class PingController {
  constructor(private prisma: PrismaService) {}

  private async withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<any> {
    let timer: NodeJS.Timeout;
    const to = new Promise<any>((_, rej) => {
      timer = setTimeout(() => rej(new Error(`TIMEOUT ${ms}ms (${label})`)), ms);
    });
    try {
      const r = await Promise.race([p, to]);
      return r;
    } finally {
      clearTimeout(timer!);
    }
  }

  @Get()
  async ping() {
    const out: any = { time: new Date().toISOString() };
    const tests: [string, () => Promise<any>][] = [
      ['raw', () => this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`],
      ['customer.findFirst', () => this.prisma.customer.findFirst({ select: { id: true } })],
      ['customer.findMany', () => this.prisma.customer.findMany({ take: 1 })],
      ['user.findUnique', () => this.prisma.user.findFirst({ select: { id: true } })],
      ['config.findUnique', () => this.prisma.config.findUnique({ where: { key: 'sales_goals' } })],
      ['order.aggregate', () => this.prisma.order.aggregate({ _count: true })],
    ];
    for (const [label, fn] of tests) {
      const t0 = Date.now();
      try {
        const r = await this.withTimeout(fn(), 6000, label);
        out[label] = `OK ${Date.now() - t0}ms`;
      } catch (e: any) {
        out[label] = `ERR ${Date.now() - t0}ms: ${String(e?.message || e).slice(0, 200)}`;
      }
    }
    out.url = (process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':***@');
    return out;
  }
}
