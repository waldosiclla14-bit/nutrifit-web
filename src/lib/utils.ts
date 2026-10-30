import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { siteConfig } from '@/lib/site-config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

export function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
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

/**
 * Descuento mostrable de un producto.
 *
 * Si `siteConfig.offers.requireVerifiedCompareAt` está activo, el precio
 * "antes" debe estar marcado con `compareAtVerified: true`. Un `oldPrice` sin
 * verificar no genera ni tachado ni porcentaje (ver docs/AUDIT.md, F-12).
 */
export function getDiscount(product: {
  price: number;
  oldPrice?: number;
  compareAtVerified?: boolean;
}) {
  if (siteConfig.offers.requireVerifiedCompareAt && !product.compareAtVerified) {
    return undefined;
  }
  return discountOf(product.price, product.oldPrice);
}

/**
 * Precio "antes" que se puede mostrar, o `undefined` si no está verificado.
 * Se usa al agregar al carrito para no arrastrar un tachado sin respaldo.
 */
export function verifiedOldPrice(product: {
  price: number;
  oldPrice?: number;
  compareAtVerified?: boolean;
}) {
  return getDiscount(product) ? product.oldPrice : undefined;
}

/** Ahorro por unidad que se puede mostrar (0 si el precio "antes" no es verificable). */
export function lineDiscount(product: {
  price: number;
  oldPrice?: number;
  compareAtVerified?: boolean;
}) {
  const oldPrice = verifiedOldPrice(product);
  return oldPrice ? Math.max(0, oldPrice - product.price) : 0;
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
