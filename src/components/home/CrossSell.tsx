'use client';

import Image from 'next/image';
import { Check, Plus, ShoppingBag } from 'lucide-react';
import { PRODUCTS } from '@/data/seed';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import Reveal from '@/components/ui/Reveal';

const CROSS_SELL_IDS = [4, 7, 10];
const BUNDLE_DISCOUNT = 10;

export default function CrossSell() {
  const { addItem, openCart } = useCart();
  const products = CROSS_SELL_IDS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean) as typeof PRODUCTS;
  const total = products.reduce((acc, p) => acc + p.price, 0);
  const discount = Math.round(total * BUNDLE_DISCOUNT / 100);
  const finalPrice = total - discount;

  const addAll = () => {
    products.forEach((p) => {
      const variant = p.variants?.[0];
      addItem({
        productId: p.id,
        slug: p.slug,
        name: variant ? `${p.name} (${variant.name})` : p.name,
        price: p.price,
        oldPrice: p.oldPrice,
        discount: 0,
        image: variant?.image ?? p.image,
        quantity: 1,
        variant: variant?.name,
      });
    });
    openCart();
  };

  return (
    <section className="bg-soft py-14 lg:py-[100px]">
      <div className="container-px">
        <Reveal className="mb-10 text-center">
          <p className="section-label">COMPRADOS JUNTOS</p>
          <h2 className="section-title">
            Los que compraron esto <span className="text-accentDeep">también llevaron</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
            Combina los favoritos y ahorra {BUNDLE_DISCOUNT}% en tu pedido.
          </p>
        </Reveal>

        <Reveal>
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch sm:gap-0">
              {products.map((product, i) => (
                <div key={product.id} className="flex items-center gap-4 sm:flex-col sm:gap-0">
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-paper p-5 shadow-sm sm:flex-1 sm:border-0 sm:rounded-none sm:border-r sm:last:border-r-0 sm:p-6">
                    <div className="relative h-24 w-24 overflow-hidden rounded-xl bg-soft">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="96px"
                        className="object-contain p-2"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
                        {product.brand}
                      </p>
                      <p className="mt-1 text-sm font-bold leading-snug text-ink line-clamp-2">
                        {product.name}
                      </p>
                      <p className="mt-1 text-sm font-bold text-accentDeep">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-ink">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  </div>
                  {i < products.length - 1 && (
                    <span className="hidden items-center justify-center sm:flex">
                      <Plus size={18} className="text-muted" />
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-line bg-paper p-6 shadow-sm sm:flex-row sm:justify-between">
              <div>
                <p className="text-sm text-muted">
                  <span className="line-through">{formatPrice(total)}</span>
                  <span className="ml-2 text-xs font-bold text-red-500">-{BUNDLE_DISCOUNT}%</span>
                </p>
                <p className="font-display text-2xl leading-none tracking-wide text-accentDeep">
                  {formatPrice(finalPrice)}
                </p>
                <p className="mt-1 text-xs text-muted">Ahorras {formatPrice(discount)}</p>
              </div>
              <button
                type="button"
                onClick={addAll}
                className="btn-accent w-full sm:w-auto"
              >
                <ShoppingBag size={18} />
                Agregar los 3 al carrito
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
