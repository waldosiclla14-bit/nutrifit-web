'use client';

import Image from 'next/image';
import { Gift, Plus } from 'lucide-react';
import type { Bundle, Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { bundlePricing, formatPrice } from '@/lib/utils';

type Props = {
  bundle: Bundle;
  products: Product[];
};

export default function BundleCard({ bundle, products }: Props) {
  const { addBundle } = useCart();
  const resolve = (productId: number) => products.find((p) => p.id === productId);
  const items = bundle.items
    .map((it) => ({ ...it, product: resolve(it.productId) }))
    .filter(
      (it): it is { productId: number; quantity: number; product: Product } =>
        it.product !== undefined,
    );
  const pricing = bundlePricing(bundle, (id) => resolve(id));

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-soft">
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        {bundle.image ? (
          <Image
            src={bundle.image}
            alt={bundle.title}
            fill
            sizes="(min-width:1024px) 50vw, 100vw"
            className="object-contain p-6"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-accent/40 to-soft" />
        )}
        {pricing.percent > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink">
            Ahorra {pricing.percent}%
          </span>
        )}
        {bundle.tag && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-paper backdrop-blur">
            <Gift size={12} className="text-accent" />
            Set
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg uppercase tracking-wide">{bundle.title}</h3>
        {bundle.subtitle && <p className="mt-1.5 text-sm text-muted">{bundle.subtitle}</p>}

        <ul className="mt-4 flex flex-col gap-2">
          {items.map((it) => (
            <li key={it.productId} className="flex items-center gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-soft text-xs font-bold text-muted">
                {it.quantity}
              </span>
              <span className="flex-1 truncate font-medium text-ink">{it.product.name}</span>
              <span className="text-xs text-muted">
                {formatPrice(it.product.price * it.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
          <div>
            {pricing.sum > pricing.price && (
              <p className="text-xs text-muted line-through">{formatPrice(pricing.sum)}</p>
            )}
            <p className="font-display text-2xl leading-none tracking-wide text-accentDeep">
              {formatPrice(pricing.price)}
            </p>
          </div>
          <button type="button" onClick={() => addBundle(bundle)} className="btn-accent !px-5 !py-2.5 text-xs">
            <Plus size={15} />
            Añadir el set
          </button>
        </div>
      </div>
    </div>
  );
}
