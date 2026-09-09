'use client';

import Image from 'next/image';
import { Check, Plus, ShoppingBag } from 'lucide-react';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import Stars from '@/components/ui/Stars';

export default function BuyTogether({
  product,
  related,
  variantName,
}: {
  product: Product;
  related: Product[];
  variantName?: string;
}) {
  const { addItem, openCart } = useCart();
  const picks = [product, ...related.slice(0, 2)];

  const total = picks.reduce((acc, p) => acc + p.price, 0);
  const oldTotal = picks.reduce((acc, p) => acc + (p.oldPrice ?? p.price), 0);
  const savings = Math.max(0, oldTotal - total);

  const pickMeta = (p: Product) => {
    if (p.id !== product.id || !variantName) return { name: p.name, image: p.image };
    const variant = p.variants?.find((v) => v.name === variantName);
    return {
      name: variant ? `${p.name} (${variant.name})` : p.name,
      image: variant?.image ?? p.image,
    };
  };

  const addAll = () => {
    picks.forEach((p) => {
      const meta = pickMeta(p);
      addItem({
        productId: p.id,
        slug: p.slug,
        name: meta.name,
        price: p.price,
        oldPrice: p.oldPrice,
        discount: Math.max(0, (p.oldPrice ?? p.price) - p.price),
        image: meta.image,
        quantity: 1,
        variant: p.id === product.id ? variantName : undefined,
      });
    });
    openCart();
  };

  return (
    <section className="mt-14">
      <h2 className="mb-4 font-display text-xl uppercase tracking-wide">
        Compra juntos y <span className="text-sport-orange">ahorra</span>
      </h2>
      <div className="rounded-3xl border border-sport-border bg-sport-surface p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {picks.map((p, i) => {
            const meta = pickMeta(p);
            return (
              <div key={p.id} className="relative min-w-0">
              {i > 0 && (
                <span className="absolute -left-4 top-1/2 z-10 hidden -translate-y-1/2 sm:flex">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sport-orange text-sport-green">
                    <Plus size={14} />
                  </span>
                </span>
              )}
              <div className="flex items-center gap-3 rounded-2xl border border-sport-border bg-sport-card p-3 sm:flex-col sm:gap-2 sm:text-center">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sport-surface sm:h-24 sm:w-24">
                  <Image
                    src={meta.image}
                    alt={meta.name}
                    fill
                    sizes="96px"
                    className="object-contain p-1.5"
                  />
                </div>
                <div className="min-w-0 sm:w-full">
                  <p className="truncate text-xs font-bold leading-snug">{meta.name}</p>
                  <div className="mt-1 flex items-center gap-1.5 sm:justify-center">
                    <Stars rating={p.rating} size={12} />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 sm:justify-center">
                    {p.oldPrice && (
                      <span className="text-[11px] text-gray-500 line-through">
                        {formatPrice(p.oldPrice)}
                      </span>
                    )}
                    <span className="text-sm font-bold text-sport-orange">
                      {formatPrice(p.price)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col items-center justify-between gap-4 border-t border-sport-border pt-5 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sport-green/15 text-sport-orange">
              <Check size={18} />
            </span>
            <div>
              <p className="text-sm">
                <span className="font-bold">Total: {formatPrice(total)}</span>
                {oldTotal > total && (
                  <span className="ml-2 text-xs text-gray-500 line-through">
                    {formatPrice(oldTotal)}
                  </span>
                )}
              </p>
              {savings > 0 && (
                <p className="text-xs font-bold text-sport-orange">
                  Ahorras {formatPrice(savings)} en este pack
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={addAll} className="btn-primary w-full sm:w-auto">
            <ShoppingBag size={16} /> Agregar todo
          </button>
        </div>
      </div>
    </section>
  );
}
