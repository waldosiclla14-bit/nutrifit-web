import type { Order } from '@/types';

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://nutrifit-api-635n.onrender.com').replace(/\/$/, '');

// Proxy mismo-origen: todas las llamadas van a /erp/* (rewrite → API).
// La cookie auth queda first-party y el navegador siempre la envía.
const API_PATH = '/erp';

// ── In-memory GET cache with TTL ──────────────────────────────────────────────
const CACHE_TTL = 30_000; // 30 seconds
const LONG_CACHE_TTL = 300_000; // 5 minutes for static data
const _cache = new Map<string, { data: any; expiry: number }>();

// Endpoints that must always be fresh (state changes rapidly)
const NO_CACHE_PATHS = ['/cash-register/current', '/cash-register/current-lite', '/todoist/status'];

// Endpoints that rarely change — use longer cache (5 min)
const LONG_CACHE_PATHS = ['/metro-stations', '/metro-stations/lines', '/metro-stations/communes'];

function cacheKey(method: string, path: string, token?: string): string {
  return `${method}:${path}:${token || ''}`;
}

function isNoCache(path: string): boolean {
  return NO_CACHE_PATHS.some((p) => path.startsWith(p));
}

function isLongCache(path: string): boolean {
  return LONG_CACHE_PATHS.some((p) => path.startsWith(p));
}

function cacheGet(key: string): any | undefined {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    _cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function cacheSet(key: string, data: any, path?: string): void {
  const ttl = path && isLongCache(path) ? LONG_CACHE_TTL : CACHE_TTL;
  _cache.set(key, { data, expiry: Date.now() + ttl });
}

// Invalidate cache entries matching a path prefix
export function clearCache(pathPrefix?: string): void {
  if (!pathPrefix) {
    _cache.clear();
    return;
  }
  for (const key of _cache.keys()) {
    // key format is "METHOD:/path:token"
    const parts = key.split(':');
    if (parts.length >= 2 && parts[1].startsWith(pathPrefix)) {
      _cache.delete(key);
    }
  }
}

// After a mutation, invalidate related cache entries
function invalidateAfterMutation(path: string): void {
  if (path.startsWith('/orders')) {
    clearCache('/orders');
  } else if (path.startsWith('/products')) {
    clearCache('/products');
  } else if (path.startsWith('/customers')) {
    clearCache('/customers');
  } else if (path.startsWith('/cash-register')) {
    clearCache('/cash-register');
  } else if (path.startsWith('/reminders')) {
    clearCache('/reminders');
  } else if (path.startsWith('/deliveries')) {
    clearCache('/deliveries');
  }
}
// ───────────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  prismaCode?: string;
  meta?: Record<string, unknown>;
  constructor(status: number, message: string, extra?: { prismaCode?: string; meta?: Record<string, unknown> }) {
    super(message);
    this.status = status;
    if (extra?.prismaCode) this.prismaCode = extra.prismaCode;
    if (extra?.meta) this.meta = extra.meta;
  }
}

export async function apiFetch<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Token explícito (transición) o nada: con HttpOnly el navegador envía la
  // cookie solo vía credentials:include; '' se ignora para no mandar 'Bearer '.
  const authToken = opts.token || null;
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const method = opts.method ?? 'GET';
  const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  const maxAttempts = method === 'GET' ? 2 : 1;

  // ── Cache check for GET requests ──────────────────────────────────────────
  if (method === 'GET' && !isNoCache(path)) {
    const key = cacheKey(method, path, opts.token);
    const cached = cacheGet(key);
    if (cached !== undefined) return cached as T;
  }
  // ──────────────────────────────────────────────────────────────────────────

  async function attempt(): Promise<Response> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), 45000) : undefined;
    try {
      return await fetch(`${API_PATH}${path}`, {
        method,
        headers,
        body,
        // HttpOnly: el navegador adjunta la cookie access_token solo.
        credentials: 'include',
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
    throw new ApiError(res.status, msg, {
      prismaCode: data?.prismaCode,
      meta: data?.meta,
    });
  }

  // ── Store in cache after successful GET ──────────────────────────────────
  if (method === 'GET' && !isNoCache(path)) {
    cacheSet(cacheKey(method, path, opts.token), data, path);
  }
  // ── Invalidate related cache after mutations ─────────────────────────────
  if (method !== 'GET') {
    invalidateAfterMutation(path);
  }
  // ──────────────────────────────────────────────────────────────────────────

  return data as T;
}

// ── Sesión HttpOnly ─────────────────────────────────────────────────────
// El JWT vive en cookie HttpOnly (JS no lo ve). Aquí solo guardamos el PERFIL
// (id/email/role, no sensible) para mostrar nombre/rol sin pedir al servidor.
// La validez real siempre la confirma el backend vía /auth/me.
const PROFILE_KEY = 'nutrifit:admin:profile';

export type SessionProfile = { id?: string; email?: string; name?: string; role?: string };

export function getSessionUser(): SessionProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as SessionProfile) : null;
  } catch {
    return null;
  }
}

export function setSessionUser(profile: SessionProfile) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile ?? {}));
  } catch {
    // ignore
  }
}

export function clearSessionUser() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // ignore
  }
}

// Valida la sesión contra el servidor (lee la cookie HttpOnly). Retorna el
// perfil si la cookie es válida, null si no hay sesión.
export async function fetchSession(): Promise<SessionProfile | null> {
  try {
    const res = await apiFetch<{ user: SessionProfile }>('/auth/me', { method: 'POST' });
    if (res?.user) {
      setSessionUser(res.user);
      return res.user;
    }
    return null;
  } catch {
    return null;
  }
}

// Cierra sesión en el servidor (borra la cookie HttpOnly) y limpia local.
export async function logoutServer(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // igual limpiamos local aunque falle la red
  }
  clearSessionUser();
  clearSessionCookie();
  clearCache();
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
  const customer = await apiFetch<{ id: string }>('/customers/public', {
    method: 'POST',
    body: { name: order.name, phone: order.phone },
  });
  const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await apiFetch('/orders/public', {
    method: 'POST',
    body: {
      idempotencyKey,
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
        variantName: i.variantName ?? '',
        sku: String(i.variantId ?? i.productId),
        unitPrice: i.price,
        quantity: i.quantity,
        total: i.price * i.quantity,
        productId: i.variantId ?? i.productId,
        variantId: i.variantId ?? null,
      })),
    },
  });
}

// ── Keep-alive ping to prevent Render cold starts ─────────────────────────────
// Pings /api/health every 10 minutes to keep the free-tier instance awake.
// Uses a 60s timeout to handle cold starts (Render free tier spins down after
// ~15 min idle and takes 30-60s to wake up).
if (typeof window !== 'undefined') {
  const KEEPALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes
  setInterval(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    fetch(`${API_BASE}/api/health`, { method: 'GET', signal: controller.signal })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
  }, KEEPALIVE_INTERVAL);
}
