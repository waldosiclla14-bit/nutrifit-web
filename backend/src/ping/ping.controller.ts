import { Controller, Get, Post } from '@nestjs/common';
import { JsonBody } from '../common/decorators/raw-body.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ping')
export class PingController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async ping() {
    const db = await this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    return { ok: true, db: db?.[0]?.ok ?? null, time: new Date().toISOString() };
  }

  @Post('probe2')
  async probe2(@JsonBody() body: any) {
    let db: any = null;
    try {
      const r = await this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
      db = r?.[0]?.ok ?? null;
    } catch (e) {
      db = 'ERR:' + (e as Error).message;
    }
    return { receivedBody: body, db };
  }
}
