import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Endpoint de eventos de envío (webhook desde el sistema de pedidos).
 *
 * Valida el secreto compartido y reenvía el evento al backend de NutriFit
 * para que procese la notificación push (insertar en notificaciones_enviadas,
 * validar preferencias del usuario y disparar web-push).
 */
export async function POST(req: NextRequest): Promise<Response> {
  // 1. Validar secreto compartido
  const webhookSecret = req.headers.get('x-webhook-secret');
  if (!webhookSecret || webhookSecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // 2. Reenviar al backend de NutriFit para procesar el evento
    const res = await fetch(`${API_BASE}/push/evento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: 'Error procesando evento en backend', detail: errorText },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, ...data });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error interno', detail: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'notificaciones' });
}
