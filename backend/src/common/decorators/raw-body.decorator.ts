import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

// The built-in express.json() body parser HANGS on JSON POSTs in this runtime
// (upstream proxy buffers/holds the body so the stream 'end' does not fire for
// a global middleware). Reading the raw stream inside the handler (this
// decorator) is the only pattern that reliably receives the body here.
function parseLimit(limit: string): number {
  const m = /^(\d+)\s*(kb|mb)?$/i.exec((limit || '1mb').trim());
  if (!m) return 1024 * 1024;
  const n = parseInt(m[1], 10);
  if (/mb/i.test(m[2] || '')) return n * 1024 * 1024;
  if (/kb/i.test(m[2] || '')) return n * 1024;
  return n;
}

function readRawBody(req: Request, limit = '5mb'): Promise<string> {
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

export const JsonBody = createParamDecorator(
  async (field: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    let raw = '';
    try {
      raw = await readRawBody(req, '5mb');
    } catch {
      raw = '';
    }
    let parsed: any = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {};
      }
    }
    if (field) return parsed ? parsed[field] : undefined;
    return parsed;
  },
);
