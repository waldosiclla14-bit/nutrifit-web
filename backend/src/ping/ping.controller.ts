import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ping')
export class PingController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async ping() {
    const out: any = { ok: true, time: new Date().toISOString() };
    try {
      const db = await this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
      out.rawOk = db?.[0]?.ok ?? null;
    } catch (e: any) {
      out.rawErr = String(e?.message || e);
    }
    try {
      const c = await this.prisma.customer.findFirst({ select: { id: true } });
      out.genOk = c ? 'row' : 'null';
    } catch (e: any) {
      out.genErr = String(e?.message || e);
    }
    out.url = (process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':***@');
    return out;
  }
}
