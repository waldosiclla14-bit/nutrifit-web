'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Gift } from 'lucide-react';
import { BUNDLES, PRODUCTS } from '@/data/seed';
import { useCart } from '@/context/CartContext';
import { bundlePricing, formatPrice } from '@/lib/utils';

export default function BundleOffers({ productId }: { productId: number }) {
  const { addBundle } = useCart();
  const [selections, setSelections] = useState<Record<string, Record<number, string>>>({});
  const resolve = (id: number) => PRODUCTS.find((p) => p.id === id);

  const matches = BUNDLES.filter((b) => b.items.some((it) => it.productId === productId));
  if (matches.length === 0) return null;

  const select = (bundleId: string, productId: number, value: string) =>
    setSelections((prev) => ({
      ...prev,
      [bundleId]: { ...prev[bundleId], [productId]: value },
    }));

  return (
    <div className="mt-8 flex flex-col gap-4">
      {matches.map((bundle) => {
        const pricing = bundlePricing(bundle, (id) => resolve(id));
        const variantItems = bundle.items
          .map((it) => ({ ...it, product: resolve(it.productId) }))
          .filter(
            (it): it is { productId: number; quantity: number; product: NonNullable<ReturnType<typeof resolve>> } =>
              !!it.product?.variants?.length,
          );
        const variantItem = variantItems[0];
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
              {variantItem && (
                <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <span className="shrink-0 font-semibold">
                    Sabor {variantItem.product.name.replace('FullEnergic 100% Whey Protein', 'whey')}
                  </span>
                  <select
                    value={
                      selections[bundle.id]?.[variantItem.productId] ??
                      variantItem.product.variants![0].name
                    }
                    onChange={(e) => select(bundle.id, variantItem.productId, e.target.value)}
                    aria-label="Sabor de la proteína"
                    className="input !h-9 !py-1 text-xs font-semibold"
                  >
                    {variantItem.product.variants!.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <button
              type="button"
              onClick={() => addBundle(bundle, selections[bundle.id])}
              className="btn-accent shrink-0 !px-5 !py-2.5 text-xs"
            >
              Añadir el set
            </button>
          </div>
        );
      })}
    </div>
  );
}
