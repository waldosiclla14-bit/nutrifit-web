'use client';

export type ApiProduct = {
  id: string;
  name: string;
  brand?: { id: string; name: string; slug: string } | null;
  sku?: string;
  price: number;
  costPrice: number;
  stock?: number;
  active: boolean;
  category?: { id: string; name: string } | null;
  variants?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    costPrice: number;
    stock: number;
    lowStockAlert: number | null;
    active: boolean;
  }[];
};

export type CartLine = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  stock: number;
};

export type CashRegister = {
  id: string;
  status: 'OPEN' | 'CLOSED';
  initialAmount: number;
  openedAt: string;
};

export const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA_MANUAL: 'Tarjeta',
  MIXTO: 'Mixto',
  FLOW_MANUAL: 'Flow',
  MERCADOPAGO_MANUAL: 'Mercado Pago',
};

export const TIME_SLOTS = Array.from({ length: 21 }, (_, i) => {
  const h = 10 + Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

export const lineKey = (l: CartLine) => l.variantId ?? l.productId;

export function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function marginOf(price: number, cost: number) {
  if (!price || price <= 0) return 0;
  return Math.round(((price - cost) / price) * 100);
}
