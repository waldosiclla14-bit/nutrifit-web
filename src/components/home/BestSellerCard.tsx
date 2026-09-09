'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import type { Product } from '@/types';
import { formatPrice, getDiscount } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import Stars from '@/components/ui/Stars';
import StockUrgency from '@/components/product/StockUrgency';

export default function BestSellerCard({ product }: { product: Product }) {
  const discount = getDiscount(product);
  const { addItem, openCart } = useCart();

  const addToCart = () => {
    const variant = product.variants?.[0];
    addItem({
      productId: product.id,
      slug: product.slug,
      name: variant ? `${product.name} (${variant.name})` : product.name,
      price: product.price,
      oldPrice: product.oldPrice,
      discount: 0,
      image: variant?.image ?? product.image,
      quantity: 1,
      variant: variant?.name,
    });
    openCart();
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-sport-border/50 bg-sport-card shadow-sportCard transition-all duration-300 hover:-translate-y-1 hover:border-sport-green/40">
      <Link
        href={`/productos/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-white/[0.03]"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-5 transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {discount && (
            <span className="rounded-full bg-sport-orange px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
              -{discount}%
            </span>
          )}
          <StockUrgency stock={product.stock} />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-4 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
          {product.brand}
        </p>
        <Link
          href={`/productos/${product.slug}`}
          className="line-clamp-2 text-sm font-bold leading-snug text-white transition-colors hover:text-sport-green"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <Stars rating={product.rating} size={13} />
          <span className="font-semibold text-white/70">{product.rating.toFixed(1)}</span>
          <span>({product.reviews})</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            {product.oldPrice && (
              <span className="text-sm text-white/30 line-through">{formatPrice(product.oldPrice)}</span>
            )}
            <span className="text-[18px] font-bold leading-none text-white">
              {formatPrice(product.price)}
            </span>
          </div>
          <button
            type="button"
            onClick={addToCart}
            aria-label={`Agregar ${product.name} al carrito`}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-sport-green text-white transition-all duration-300 hover:bg-sport-greenLight group-hover:shadow-sportGlow"
          >
            <ShoppingBag size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
