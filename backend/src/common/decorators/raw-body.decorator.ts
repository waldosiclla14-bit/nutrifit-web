import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

function parseLimit(limit: string): number {
  const m = /^(\d+)\s*(kb|mb)?$/i.exec((limit || '1mb').trim());
  if (!m) return 1024 * 1024;
  const n = parseInt(m[1], 10);
  if (/mb/i.test(m[2] || '')) return n * 1024 * 1024;
  if (/kb/i.test(m[2] || '')) return n * 1024;
  return n;
}

// Reads the raw request stream. The built-in express.json() HANGS on JSON
// POSTs in this runtime (upstream proxy buffers/holds the body so the stream
// 'end' does not fire for a global middleware). Reading the stream INSIDE the
// handler method (not in a param decorator) is the only pattern that reliably
// receives the body here.
export function readJsonBody(req: Request, limit = '5mb'): Promise<any> {
  const limitBytes = parseLimit(limit);
  return new Promise((resolve) => {
    let done = false;
    const finish = (value: any) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > limitBytes) {
        req.destroy();
        finish({});
      }
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return finish({});
      try {
        finish(JSON.parse(raw));
      } catch {
        finish({});
      }
    });
    req.on('error', () => finish({}));
    // Force the stream into flowing mode. In some proxy/runtimes (Cloudflare ->
    // Render -> Node) the 'data' auto-resume does not fire reliably, so we
    // explicitly resume to guarantee the buffered body is delivered.
    req.resume();
    // Hard safety net: never let a stuck body stream hang the handler forever
    // (a hang surfaces to the proxy as a 502 Bad Gateway). If 'end' never fires
    // we resolve with an empty body so the handler proceeds and returns a real
    // response instead of stalling.
    setTimeout(() => finish({}), 5000);
  });
}
