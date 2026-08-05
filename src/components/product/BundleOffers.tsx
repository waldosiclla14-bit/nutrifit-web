'use client';

import Image from 'next/image';
import { Gift } from 'lucide-react';
import { BUNDLES, PRODUCTS } from '@/data/seed';
import { useCart } from '@/context/CartContext';
import { bundlePricing, formatPrice } from '@/lib/utils';

export default function BundleOffers({ productId }: { productId: number }) {
  const { addBundle } = useCart();
  const resolve = (id: number) => PRODUCTS.find((p) => p.id === id);

  const matches = BUNDLES.filter((b) => b.items.some((it) => it.productId === productId));
  if (matches.length === 0) return null;

  return (
    <div className="mt-8 flex flex-col gap-4">
      {matches.map((bundle) => {
        const pricing = bundlePricing(bundle, (id) => resolve(id));
        return (
          <div
            key={bundle.id}
            className="flex flex-col gap-4 rounded-3xl border border-accent/60 bg-accent/10 p-5 sm:flex-row sm:items-center"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-soft">
              {bundle.image && (
                <Image
                  src={bundle.image}
                  alt={bundle.title}
                  fill
                  sizes="80px"
                  className="object-contain p-2"
                />
              )}
            </div>
            <div className="flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-accentDeep">
                <Gift size={13} />
                Compra este set y ahorra {pricing.percent}%
              </p>
              <p className="mt-1 font-display text-base uppercase tracking-wide">{bundle.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                <span className="line-through">{formatPrice(pricing.sum)}</span>{' '}
                <span className="font-semibold text-ink">{formatPrice(pricing.price)}</span>
              </p>
            </div>
            <button type="button" onClick={() => addBundle(bundle)} className="btn-accent shrink-0 !px-5 !py-2.5 text-xs">
              Añadir el set
            </button>
          </div>
        );
      })}
    </div>
  );
}
