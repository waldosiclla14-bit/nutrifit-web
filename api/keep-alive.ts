import type { NextRequest } from 'next/server';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://nutrifit-api-635n.onrender.com').replace(/\/$/, '');

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: NextRequest) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const start = Date.now();
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(30_000),
    });
    const elapsed = Date.now() - start;
    const body = await res.json().catch(() => null);

    return new Response(
      JSON.stringify({
        ok: res.ok,
        status: res.status,
        backend: body,
        elapsed,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      },
    );
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || 'Unknown error',
        elapsed,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      },
    );
  }
}
