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
}: {
  product: Product;
  related: Product[];
}) {
  const { addItem, openCart } = useCart();
  const picks = [product, ...related.slice(0, 2)];

  const total = picks.reduce((acc, p) => acc + p.price, 0);
  const oldTotal = picks.reduce((acc, p) => acc + (p.oldPrice ?? p.price), 0);
  const savings = Math.max(0, oldTotal - total);

  const addAll = () => {
    picks.forEach((p) => {
      addItem({
        productId: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        oldPrice: p.oldPrice,
        discount: Math.max(0, (p.oldPrice ?? p.price) - p.price),
        image: p.image,
        quantity: 1,
      });
    });
    openCart();
  };

  return (
    <section className="mt-14">
      <h2 className="mb-4 font-display text-xl uppercase tracking-wide">
        Compra juntos y <span className="text-accentDeep">ahorra</span>
      </h2>
      <div className="rounded-3xl border border-line bg-soft p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {picks.map((p, i) => (
            <div key={p.id} className="relative min-w-0">
              {i > 0 && (
                <span className="absolute -left-4 top-1/2 z-10 hidden -translate-y-1/2 sm:flex">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-accent">
                    <Plus size={14} />
                  </span>
                </span>
              )}
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-3 sm:flex-col sm:gap-2 sm:text-center">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-soft sm:h-24 sm:w-24">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="96px"
                    className="object-contain p-1.5"
                  />
                </div>
                <div className="min-w-0 sm:w-full">
                  <p className="truncate text-xs font-bold leading-snug">{p.name}</p>
                  <div className="mt-1 flex items-center gap-1.5 sm:justify-center">
                    <Stars rating={p.rating} size={12} />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 sm:justify-center">
                    {p.oldPrice && (
                      <span className="text-[11px] text-muted line-through">
                        {formatPrice(p.oldPrice)}
                      </span>
                    )}
                    <span className="text-sm font-bold text-accentDeep">
                      {formatPrice(p.price)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col items-center justify-between gap-4 border-t border-line pt-5 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accentDeep">
              <Check size={18} />
            </span>
            <div>
              <p className="text-sm">
                <span className="font-bold">Total: {formatPrice(total)}</span>
                {oldTotal > total && (
                  <span className="ml-2 text-xs text-muted line-through">
                    {formatPrice(oldTotal)}
                  </span>
                )}
              </p>
              {savings > 0 && (
                <p className="text-xs font-bold text-accentDeep">
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
