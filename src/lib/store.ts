import type { Order, Settings } from '@/types';

export const STORAGE_KEY = 'nutrifit:store:v1';
const CHANGE_EVENT = 'nutrifit:store:changed';

export const DEFAULT_SETTINGS: Settings = {
  whatsapp: '56923883826',
  freeShippingFrom: 40000,
  shipping: 2000,
  giftProductId: 13,
  giftThreshold: 45000,
  giftLabel: 'recibir un regalo',
  rewardThreshold: 60000,
  rewardPercent: 5,
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
    return {
      orders: parsed.orders ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
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
