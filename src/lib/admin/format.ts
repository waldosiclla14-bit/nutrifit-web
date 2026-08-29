import { STATUS_LABEL } from './constants';
import { webFooter } from '@/lib/whatsapp';
import type { AdminOrder } from '@/types/admin';

export function waLink(order: AdminOrder) {
  const phone = (order.customer?.phone || '').replace(/\D/g, '');
  const msg = encodeURIComponent(
    `Hola ${order.customer?.name || ''}! Tu pedido ${order.orderNumber} está ${
      STATUS_LABEL[order.status] || order.status
    }. Respondeme para coordinar la entrega.${webFooter()}`,
  );
  return `https://wa.me/56${phone}?text=${msg}`;
}

export function marginOf(price: number, cost: number) {
  if (!price || price <= 0) return 0;
  return Math.round(((price - cost) / price) * 100);
}

export function marginCls(margin: number) {
  if (margin >= 35) return 'border-emerald-300 text-emerald-700';
  if (margin >= 15) return 'border-accent/60 text-accent';
  return 'border-red-300 text-red-600';
}

export function stockLevel(stock: number, alert: number | null) {
  if (stock <= 0) return { label: 'agotado', cls: 'border-red-300 text-red-600' };
  if (alert === null) return { label: '—', cls: 'border-line text-muted' };
  if (stock <= alert) return { label: 'bajo', cls: 'border-amber-300 text-amber-700' };
  return { label: 'ok', cls: 'border-emerald-300 text-emerald-700' };
}

export function progressPct(actual: number, goal: number) {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round((actual / goal) * 100));
}