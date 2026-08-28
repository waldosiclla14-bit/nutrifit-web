'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag } from 'lucide-react';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { formatPrice, getDiscount } from '@/lib/utils';
import Stars from '@/components/ui/Stars';
import StockUrgency from '@/components/product/StockUrgency';
import { cx } from '@/lib/utils';

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const discount = getDiscount(product);
  const fav = isFavorite(product.id);
  const hasVariants = !!product.variants && product.variants.length > 0;

  const addToCart = () => {
    if (hasVariants) {
      router.push(`/productos/${product.slug}`);
      return;
    }
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      oldPrice: product.oldPrice,
      discount: Math.max(0, (product.oldPrice ?? product.price) - product.price),
      image: product.image,
      quantity: 1,
    });
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
      <Link
        href={`/productos/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-soft"
      >
        {!loaded && <div className="skeleton absolute inset-0" aria-hidden="true" />}
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          onLoad={() => setLoaded(true)}
          className={cx(
            'object-contain p-5 transition-transform duration-500 group-hover:scale-105',
            !loaded && 'opacity-0',
          )}
        />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {discount && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink">
              -{discount}%
            </span>
          )}
          {product.bestseller && (
            <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
              Más vendido
            </span>
          )}
          {hasVariants && (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-accentDeep shadow-sm">
              {product.variants!.length} sabores
            </span>
          )}
          <StockUrgency stock={product.stock} />
        </div>
      </Link>

      <button
        type="button"
        onClick={() => toggleFavorite(product.id)}
        aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper/90 backdrop-blur transition-all ${
          fav ? 'text-red-500' : 'text-muted hover:text-red-500'
        }`}
      >
        <Heart size={16} className={fav ? 'fill-red-500' : ''} />
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-4 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
          {product.brand}
        </p>
        <Link
          href={`/productos/${product.slug}`}
          className="line-clamp-2 text-sm font-bold leading-snug transition-colors hover:text-accentDeep"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Stars rating={product.rating} size={13} />
          <span className="font-semibold text-ink">{product.rating.toFixed(1)}</span>
          <span>({product.reviews})</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            {product.oldPrice && (
              <span className="text-sm text-muted line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
            <span className="text-[18px] font-bold leading-none text-ink">
              {formatPrice(product.price)}
            </span>
          </div>
          <button
            type="button"
            onClick={addToCart}
            aria-label={`Agregar ${product.name} al carrito`}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white transition-all duration-300 hover:bg-accent hover:text-ink group-hover:shadow-glow"
          >
            <ShoppingBag size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
