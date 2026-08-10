'use client';

import { useState } from 'react';
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

  const [selections, setSelections] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      items
        .filter((it) => it.product.variants && it.product.variants.length > 0)
        .map((it) => [it.productId, it.product.variants![0].name]),
    ),
  );

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-soft">
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        {items.length > 0 ? (
          <div className="relative flex h-full items-center justify-center">
            {items.map((it) => (
              <div key={it.productId} className="relative h-full min-w-0 flex-1">
                <Image
                  src={it.product.image}
                  alt={it.product.name}
                  fill
                  sizes="(min-width:1024px) 25vw, 50vw"
                  className="object-contain p-4"
                />
              </div>
            ))}
            {items.length > 1 && (
              <span className="absolute z-10 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-paper text-sm font-extrabold text-accentDeep shadow-soft">
                +
              </span>
            )}
          </div>
        ) : bundle.image ? (
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

        <ul className="mt-4 flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.productId} className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-soft text-xs font-bold text-muted">
                  {it.quantity}
                </span>
                <span className="flex-1 truncate font-medium text-ink">{it.product.name}</span>
                <span className="text-xs text-muted">
                  {formatPrice(it.product.price * it.quantity)}
                </span>
              </div>
              {it.product.variants && it.product.variants.length > 0 && (
                <label className="ml-9 flex items-center gap-2 text-xs text-muted">
                  <span className="shrink-0 font-semibold">Sabor</span>
                  <select
                    value={selections[it.productId] ?? it.product.variants[0].name}
                    onChange={(e) =>
                      setSelections((prev) => ({ ...prev, [it.productId]: e.target.value }))
                    }
                    aria-label={`Sabor de ${it.product.name}`}
                    className="input !h-9 !py-1 text-xs font-semibold"
                  >
                    {it.product.variants.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
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
          <button
            type="button"
            onClick={() => addBundle(bundle, selections)}
            className="btn-accent !px-5 !py-2.5 text-xs"
          >
            <Plus size={15} />
            Añadir el set
          </button>
        </div>
      </div>
    </div>
  );
}
