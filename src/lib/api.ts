import type { Order } from '@/types';

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://nutrifit-api-635n.onrender.com').replace(/\/$/, '');

const TOKEN_KEY = 'nutrifit:admin:token';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const method = opts.method ?? 'GET';
  const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  const maxAttempts = method === 'GET' ? 2 : 1;

  async function attempt(): Promise<Response> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), 25000) : undefined;
    try {
      return await fetch(`${API_BASE}/api${path}`, {
        method,
        headers,
        body,
        signal: controller?.signal,
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  let res: Response | undefined;
  let lastError: any;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      res = await attempt();
      break;
    } catch (e: any) {
      lastError = e;
      if (i < maxAttempts - 1) await new Promise((r) => setTimeout(r, 1200));
    }
  }
  if (!res) {
    if (lastError?.name === 'AbortError')
      throw new ApiError(408, 'El servidor tardó demasiado en responder. Intenta de nuevo.');
    throw new ApiError(0, 'No se pudo conectar con el servidor.');
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && data.message
        ? Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message
        : `Error ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

const SESSION_COOKIE = 'nf_session';

export function setSessionCookie() {
  if (typeof window === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=86400; samesite=lax${secure}`;
}

export function clearSessionCookie() {
  if (typeof window === 'undefined') return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export async function submitStoreOrder(order: Order): Promise<void> {
  const customer = await apiFetch<{ id: string }>('/customers', {
    method: 'POST',
    body: { name: order.name, phone: order.phone },
  });
  await apiFetch('/orders', {
    method: 'POST',
    body: {
      customerId: customer.id,
      customerName: order.name,
      customerPhone: order.phone,
      deliveryType: 'METRO',
      metroLine: order.metroLine,
      metroStation: order.metroStation,
      subtotal: order.subtotal,
      discount: order.discount ?? 0,
      couponCode: order.couponCode ?? undefined,
      shippingCost: order.shipping,
      total: order.total,
      paymentMethod: 'EFECTIVO',
      items: order.items.map((i) => ({
        productName: i.name,
        variantName: '',
        sku: String(i.productId),
        unitPrice: i.price,
        quantity: i.quantity,
        total: i.price * i.quantity,
        productId: null,
        variantId: null,
      })),
    },
  });
}
