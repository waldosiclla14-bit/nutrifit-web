import type { CustomerProfile, Order, Settings } from '@/types';
import { siteConfig } from '@/lib/site-config';

export const STORAGE_KEY = 'nutrifit:store:v1';
const PROFILE_KEY = 'nutrifit:customer:v1';
const CHANGE_EVENT = 'nutrifit:store:changed';

export const DEFAULT_SETTINGS: Settings = {
  whatsapp: '56923883826',
  shipping: siteConfig.delivery.metroFee,
  giftProductId: undefined,
  giftThreshold: 0,
  giftLabel: 'recibir un regalo',
  rewardThreshold: siteConfig.offers.rewardThreshold,
  rewardPercent: siteConfig.offers.rewardPercent,
};

export type DB = {
  orders: Order[];
  settings: Settings;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

export function loadDB(): DB {
  if (!isBrowser()) return { orders: [], settings: { ...DEFAULT_SETTINGS } };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = { orders: [], settings: { ...DEFAULT_SETTINGS } } as DB;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<DB>;
    const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) };
    if (settings.shipping === 2000) {
      settings.shipping = DEFAULT_SETTINGS.shipping;
    }
    // Gift feature temporarily disabled: force off for users with old stored values
    if (settings.giftThreshold === 45000) settings.giftThreshold = 0;
    if (settings.giftProductId === 13) settings.giftProductId = undefined;
    return {
      orders: parsed.orders ?? [],
      settings,
    };
  } catch {
    return { orders: [], settings: { ...DEFAULT_SETTINGS } };
  }
}

export function saveDB(db: DB) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: db }));
  } catch {
    // storage may be unavailable (private mode) — ignore
  }
}

export function subscribeStore(callback: () => void) {
  if (!isBrowser()) return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function mutate(mutator: (db: DB) => void) {
  const db = loadDB();
  mutator(db);
  saveDB(db);
}

export function getSettings() {
  return loadDB().settings;
}

export function getOrders() {
  return loadDB().orders;
}

export function saveOrder(order: Order) {
  mutate((db) => {
    db.orders.unshift(order);
  });
}

export function updateOrderStatus(id: string, status: Order['status']) {
  mutate((db) => {
    const order = db.orders.find((o) => o.id === id);
    if (order) order.status = status;
  });
}

export function deleteOrder(id: string) {
  mutate((db) => {
    db.orders = db.orders.filter((o) => o.id !== id);
  });
}

export function resetStore() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  saveDB({ orders: [], settings: { ...DEFAULT_SETTINGS } });
}

// Perfil del cliente (nombre, teléfono, método de entrega y sus datos) para
// autocompletar el checkout en compras recurrentes. Se guarda aparte del DB
// de la tienda para no interferir con pedidos ni configuración.
export function getCustomerProfile(): CustomerProfile | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CustomerProfile>;
    if (!parsed.name && !parsed.phone) return null;
    return {
      name: parsed.name ?? '',
      phone: parsed.phone ?? '',
      deliveryMethod: parsed.deliveryMethod,
      metroLine: parsed.metroLine,
      metroStation: parsed.metroStation,
      address: parsed.address,
      comuna: parsed.comuna,
      blueSize: parsed.blueSize,
    };
  } catch {
    return null;
  }
}

/**
 * Guarda el perfil conservando los datos de la modalidad de entrega que no
 * usa el pedido actual. Así un cliente que compra hoy a domicilio y mañana
 * retira en Metro no pierde su dirección, y viceversa.
 */
export function saveCustomerProfile(profile: CustomerProfile) {
  if (!isBrowser()) return;
  try {
    const current = getCustomerProfile();
    const merged: CustomerProfile = {
      ...current,
      ...profile,
      // Los datos de la otra modalidad se conservan si el pedido actual no los trae.
      metroLine: profile.metroLine ?? current?.metroLine,
      metroStation: profile.metroStation ?? current?.metroStation,
      address: profile.address ?? current?.address,
      comuna: profile.comuna ?? current?.comuna,
      blueSize: profile.blueSize ?? current?.blueSize,
    };
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
  } catch {
    // storage may be unavailable (private mode) — ignore
  }
}

export function clearCustomerProfile() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // ignore
  }
}

// Código de cupón pendiente de aplicar en el carrito (p. ej. desde el modal de
// primera compra). Se consume una vez y se borra.
const PENDING_COUPON_KEY = 'nutrifit:pending-coupon:v1';

export function setPendingCoupon(code: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PENDING_COUPON_KEY, code.trim().toUpperCase());
  } catch {
    // ignore
  }
}

export function takePendingCoupon(): string | null {
  if (!isBrowser()) return null;
  try {
    const code = window.localStorage.getItem(PENDING_COUPON_KEY);
    if (code) window.localStorage.removeItem(PENDING_COUPON_KEY);
    return code;
  } catch {
    return null;
  }
}
