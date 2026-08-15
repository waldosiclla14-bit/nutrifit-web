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
    // NOTE: do NOT call req.resume() here. On a Node http.IncomingMessage the
    // 'data' listener auto-resumes the stream; calling req.resume() explicitly
    // can synchronously flush a buffered body in a tight loop, blocking the
    // event loop so no timer (incl. the safety timeout below) can fire and the
    // request hangs until the proxy 502s. The 5s hard timeout is the safety net
    // for the rare case the body never delivers 'end'.
    setTimeout(() => finish({}), 5000);
  });
}
