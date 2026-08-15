import {
  Controller,
  Get,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

function readRawBody(req: Request, limit = '1mb'): Promise<string> {
  const limitBytes = parseLimit(limit);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseLimit(limit: string): number {
  const m = /^(\d+)\s*(kb|mb)?$/i.exec(limit.trim());
  if (!m) return 1024 * 1024;
  const n = parseInt(m[1], 10);
  if (/mb/i.test(m[2] || '')) return n * 1024 * 1024;
  if (/kb/i.test(m[2] || '')) return n * 1024;
  return n;
}

@Controller('ping')
export class PingController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async ping() {
    const db = await this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    return { ok: true, db: db?.[0]?.ok ?? null, time: new Date().toISOString() };
  }

  @Post('probe')
  async probe(@Req() req: Request) {
    // Controller-side raw read (proven working pattern)
    let controllerRaw = '';
    try {
      controllerRaw = await readRawBody(req, '1mb');
    } catch (e) {
      controllerRaw = 'ERR:' + (e as Error).message;
    }
    // middleware-set body (set by rawJsonBodyParser)
    const mwBody = (req as any).body;
    let db = null;
    try {
      const r = await this.prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
      db = r?.[0]?.ok ?? null;
    } catch (e) {
      db = 'ERR:' + (e as Error).message;
    }
    return {
      controllerRaw,
      controllerRawLen: controllerRaw.length,
      middlewareBody: mwBody,
      middlewareBodyType: typeof mwBody,
      db,
    };
  }
}
