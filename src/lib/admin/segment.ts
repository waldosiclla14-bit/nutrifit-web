import type { AdminCustomer } from '@/types/admin';

export function customerSegment(c: AdminCustomer): { label: string; cls: string } {
  if (c.isVip) return { label: 'VIP', cls: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (c.totalSpent >= 100000) return { label: 'VIP', cls: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (c.totalOrders >= 3) return { label: 'Recurrente', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  if (c.totalOrders >= 1) return { label: 'Activo', cls: 'bg-sky-100 text-sky-800 border-sky-300' };
  if (c.lastOrderAt) return { label: 'Dormido', cls: 'bg-slate-100 text-slate-700 border-slate-300' };
  return { label: 'Nuevo', cls: 'bg-soft text-muted border-line' };
}