import type { Order } from '@/types';

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

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
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
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
      deliveryDay: order.deliveryDay,
      deliveryTime: order.deliveryTime,
      subtotal: order.subtotal,
      discount: order.discount ?? 0,
      couponCode: order.couponCode ?? undefined,
      shippingCost: order.shipping,
      total: order.total,
      paymentMethod: order.payment === 'Efectivo' ? 'EFECTIVO' : 'TRANSFERENCIA',
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
