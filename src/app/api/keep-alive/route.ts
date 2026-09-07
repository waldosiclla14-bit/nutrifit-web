import { NextResponse } from 'next/server';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://nutrifit-api-635n.onrender.com').replace(/\/$/, '');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const start = Date.now();
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    });
    const elapsed = Date.now() - start;
    const body = await res.json().catch(() => null);

    return NextResponse.json({
      ok: res.ok,
      backend: body,
      elapsed,
      timestamp: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Unknown error',
      elapsed,
      timestamp: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
