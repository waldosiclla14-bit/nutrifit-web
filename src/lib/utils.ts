export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function formatPrice(amount: number) {
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString('es-CL')}`;
  }
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function discountOf(price: number, oldPrice?: number) {
  if (!oldPrice || oldPrice <= price) return undefined;
  return Math.round((1 - price / oldPrice) * 100);
}

export function getDiscount(product: { price: number; oldPrice?: number }) {
  return discountOf(product.price, product.oldPrice);
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function bundlePricing(
  bundle: {
    items: { productId: number; quantity: number }[];
    pricing: 'sum' | 'fixed';
    fixedPrice?: number;
  },
  resolve: (productId: number) => { price: number } | undefined,
) {
  const sum = bundle.items.reduce((acc, it) => {
    const p = resolve(it.productId);
    return acc + (p ? p.price * it.quantity : 0);
  }, 0);
  const price =
    bundle.pricing === 'fixed' && bundle.fixedPrice != null ? bundle.fixedPrice : sum;
  return {
    sum,
    price,
    saving: Math.max(0, sum - price),
    percent: sum > 0 ? Math.round(((sum - price) / sum) * 100) : 0,
  };
}
