export const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Nuevo',
  CONFIRMED: 'Confirmado',
  PAID: 'Pagado',
  PREPARING: 'Preparando',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  RETURNED: 'Devuelto',
};

export const STATUS_STYLE: Record<string, string> = {
  PENDING: 'border-amber-300 bg-amber-100 text-amber-800',
  CONFIRMED: 'border-sky-300 bg-sky-100 text-sky-800',
  PAID: 'border-emerald-300 bg-emerald-100 text-emerald-800',
  PREPARING: 'border-violet-300 bg-violet-100 text-violet-800',
  READY: 'border-teal-300 bg-teal-100 text-teal-800',
  DELIVERED: 'border-line bg-soft text-muted',
  CANCELLED: 'border-red-300 bg-red-100 text-red-800',
  RETURNED: 'border-red-300 bg-red-100 text-red-800',
};

export const PAYMENT_LABEL: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  FLOW_MANUAL: 'Flow',
  MERCADOPAGO_MANUAL: 'Mercado Pago',
  TARJETA_MANUAL: 'Tarjeta',
  MIXTO: 'Mixto',
};

export const CHART_COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];