'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import type { Product } from '@/types';
import { formatPrice, getDiscount } from '@/lib/utils';
import { openWhatsApp, webFooter } from '@/lib/whatsapp';
import { getSettings } from '@/lib/store';
import Stars from '@/components/ui/Stars';
import StockUrgency from '@/components/product/StockUrgency';

export default function BestSellerCard({ product }: { product: Product }) {
  const discount = getDiscount(product);

  const orderViaWhatsApp = () => {
    const message = [
      'HOLA NUTRIFIT',
      'QUIERO ESTE PRODUCTO',
      '─'.repeat(24),
      '',
      `*Producto:* ${product.name}`,
      `*Cantidad:* 1`,
      `*Precio:* ${formatPrice(product.price)}`,
      '',
      '¿Está disponible? Quiero coordinar mi entrega en metro.',
      webFooter(),
    ].join('\n');
    openWhatsApp(getSettings().whatsapp, message);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-paper transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
      <Link
        href={`/productos/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-soft"
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
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink">
              -{discount}%
            </span>
          )}
          <StockUrgency stock={product.stock} />
        </div>
      </Link>

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
              <span className="text-xs text-muted line-through">{formatPrice(product.oldPrice)}</span>
            )}
            <span className="font-display text-lg leading-none tracking-wide text-ink">
              {formatPrice(product.price)}
            </span>
          </div>
          <button
            type="button"
            onClick={orderViaWhatsApp}
            aria-label={`Pedir ${product.name} por WhatsApp`}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white transition-all duration-300 hover:bg-accent hover:text-ink group-hover:shadow-glow"
          >
            <MessageCircle size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
