'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, ChevronRight, Heart, MessageCircle, Minus, Plus, ShoppingBag, ShieldCheck, Truck } from 'lucide-react';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { formatPrice, getDiscount } from '@/lib/utils';
import { openWhatsApp } from '@/lib/whatsapp';
import { getSettings } from '@/lib/store';
import RatingSummary from '@/components/ui/RatingSummary';
import ProductCard from '@/components/product/ProductCard';
import BuyTogether from '@/components/product/BuyTogether';
import ProductReviews from '@/components/product/ProductReviews';
import StockUrgency from '@/components/product/StockUrgency';
import BundleOffers from '@/components/product/BundleOffers';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 font-display text-xl uppercase tracking-wide">{children}</h2>
  );
}

export default function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const { addItem, openCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [qty, setQty] = useState(1);
  const discount = getDiscount(product);
  const fav = isFavorite(product.id);

  const addToCart = (q: number) => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      oldPrice: product.oldPrice,
      discount: Math.max(0, (product.oldPrice ?? product.price) - product.price),
      image: product.image,
      quantity: q,
    });
    openCart();
  };

  const orderViaWhatsApp = () => {
    const message = [
      'HOLA NUTRIFIT',
      'QUIERO ESTE PRODUCTO',
      '─'.repeat(24),
      '',
      `*Producto:* ${product.name}`,
      `*Cantidad:* ${qty}`,
      `*Precio:* ${formatPrice(product.price * qty)}`,
      '',
      '¿Está disponible? Quiero coordinar mi entrega en metro.',
    ].join('\n');
    openWhatsApp(getSettings().whatsapp, message);
  };

  const infoCards = useMemo(
    () => [
      { icon: Truck, text: 'Entrega en metro, todas las líneas' },
      { icon: ShieldCheck, text: 'Producto 100% original, sello de garantía' },
      { icon: Check, text: 'Garantía de satisfacción de 30 días' },
    ],
    [],
  );

  return (
    <div className="container-px py-10">
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="transition-colors hover:text-accentDeep">
          Inicio
        </Link>
        <ChevronRight size={12} />
        <Link href="/productos" className="transition-colors hover:text-accentDeep">
          Catálogo
        </Link>
        <ChevronRight size={12} />
        <span className="font-semibold text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-line bg-soft">
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain p-8"
            />
            {discount && (
              <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-ink">
                -{discount}%
              </span>
            )}
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {infoCards.map((card) => (
              <li key={card.text} className="flex items-center gap-2.5 rounded-2xl border border-line bg-soft px-4 py-3 text-xs font-semibold">
                <card.icon size={16} className="shrink-0 text-accentDeep" />
                {card.text}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-accent">
              {product.brand}
            </span>
            {product.bestseller && (
              <span className="rounded-full bg-soft2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest">
                Más vendido
              </span>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl uppercase leading-tight tracking-wide sm:text-4xl">
            {product.name}
          </h1>
          <div className="mt-3">
            <RatingSummary rating={product.rating} count={product.reviews} />
          </div>

          <div className="mt-5 flex items-end gap-3">
            <span className="font-display text-4xl leading-none tracking-wide">
              {formatPrice(product.price)}
            </span>
            {product.oldPrice && (
              <span className="pb-1 text-base text-muted line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
            {discount && (
              <span className="mb-1 rounded-full bg-accent px-2 py-0.5 text-xs font-extrabold text-ink">
                Ahorras {formatPrice((product.oldPrice ?? 0) - product.price)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-accentDeep">
            Precio incluye IVA
          </p>

          <p className="mt-5 text-sm leading-relaxed text-ink/80">{product.desc}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {product.benefits.map((b) => (
              <span key={b} className="chip bg-soft">
                ✓ {b}
              </span>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-full border border-line">
              <button
                type="button"
                onClick={() => setQty((v) => Math.max(1, v - 1))}
                aria-label="Disminuir cantidad"
                className="flex h-12 w-12 items-center justify-center rounded-l-full transition-colors hover:bg-soft"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-bold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((v) => v + 1)}
                aria-label="Aumentar cantidad"
                className="flex h-12 w-12 items-center justify-center rounded-r-full transition-colors hover:bg-soft"
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="text-xs text-muted">
              Stock disponible: <strong className="text-ink">{product.stock} uds.</strong>
            </p>
            <button
              type="button"
              onClick={() => toggleFavorite(product.id)}
              aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              className={`ml-auto flex h-12 w-12 items-center justify-center rounded-full border border-line transition-colors ${
                fav ? 'text-red-500' : 'text-muted hover:text-red-500'
              }`}
            >
              <Heart size={18} className={fav ? 'fill-red-500' : ''} />
            </button>
          </div>

          {product.stock <= 10 && (
            <div className="mt-4 max-w-xs">
              <StockUrgency stock={product.stock} variant="bar" />
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => addToCart(qty)} className="btn-primary">
              <ShoppingBag size={16} /> Agregar al carrito
            </button>
            <button type="button" onClick={orderViaWhatsApp} className="btn-accent">
              <MessageCircle size={16} /> Comprar por WhatsApp
            </button>
          </div>
          <BundleOffers productId={product.id} />
          <p className="mt-3 text-center text-xs text-muted sm:text-left">
            Envío gratis en metro sobre {formatPrice(getSettings().freeShippingFrom)}.
          </p>
        </div>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-3">
        <div className="rounded-3xl border border-line p-6 lg:col-span-2">
          <SectionTitle>Detalles del producto</SectionTitle>
          <div className="space-y-6 text-sm leading-relaxed text-ink/80">
            <div>
              <h3 className="mb-1.5 font-bold text-ink">Modo de uso</h3>
              <p>{product.modoUso}</p>
            </div>
            <div>
              <h3 className="mb-1.5 font-bold text-ink">Ingredientes</h3>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {product.ingredientes.map((ing) => (
                  <li key={ing} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accentDeep" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-line p-6">
          <SectionTitle>Nutrientes</SectionTitle>
          <ul className="divide-y divide-line">
            {product.nutrientes.map(([label, value]) => (
              <li key={label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted">{label}</span>
                <span className="font-bold">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ProductReviews
        productId={product.id}
        initialRating={product.rating}
        reviewCount={product.reviews}
      />

      {related.length > 0 && <BuyTogether product={product} related={related} />}

      {related.length > 0 && (
        <div className="mt-14">
          <SectionTitle>Productos relacionados</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
