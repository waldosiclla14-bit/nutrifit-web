'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, ChevronRight, Heart, MessageCircle, Minus, Plus, ShoppingBag, ShieldCheck, Truck } from 'lucide-react';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { formatPrice, getDiscount, cx } from '@/lib/utils';
import { openWhatsApp, webFooter } from '@/lib/whatsapp';
import { getSettings } from '@/lib/store';
import RatingSummary from '@/components/ui/RatingSummary';
import ProductCard from '@/components/product/ProductCard';
import BuyTogether from '@/components/product/BuyTogether';
import ProductReviews from '@/components/product/ProductReviews';
import StockUrgency from '@/components/product/StockUrgency';
import BundleOffers from '@/components/product/BundleOffers';
import LiveViewers from '@/components/product/LiveViewers';

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
  const [flavor, setFlavor] = useState(product.variants?.[0]?.name ?? '');
  const discount = getDiscount(product);
  const fav = isFavorite(product.id);
  const isAccessory = product.category === 'accesorios';
  const selected = product.variants?.find((v) => v.name === flavor) ?? null;
  const img = selected?.image ?? product.image;
  const stock = selected?.stock ?? product.stock;
  const rating = selected?.rating ?? product.rating;
  const reviews = selected?.reviews ?? product.reviews;
  const cartName = selected ? `${product.name} (${selected.name})` : product.name;

  const addToCart = (q: number) => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: cartName,
      price: product.price,
      oldPrice: product.oldPrice,
      discount: Math.max(0, (product.oldPrice ?? product.price) - product.price),
      image: img,
      quantity: q,
      variant: selected?.name,
    });
    openCart();
  };

  const orderViaWhatsApp = () => {
    const message = [
      'HOLA NUTRIFIT',
      'QUIERO ESTE PRODUCTO',
      '─'.repeat(24),
      '',
      `*Producto:* ${cartName}`,
      `*Cantidad:* ${qty}`,
      `*Precio:* ${formatPrice(product.price * qty)}`,
      '',
      '¿Está disponible? Quiero coordinar mi entrega en metro.',
      webFooter(),
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
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        <Link href="/" className="transition-colors hover:text-sport-orange">
          Inicio
        </Link>
        <ChevronRight size={12} />
        <Link href="/productos" className="transition-colors hover:text-sport-orange">
          Catálogo
        </Link>
        <ChevronRight size={12} />
        <span className="font-semibold text-gray-900">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-sport-border bg-sport-surface">
            <Image
              src={img}
              alt={cartName}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain p-8"
            />
            {discount && (
              <span className="absolute left-4 top-4 rounded-full bg-sport-green px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white">
                -{discount}%
              </span>
            )}
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {infoCards.map((card) => (
              <li key={card.text} className="flex items-center gap-2.5 rounded-2xl border border-sport-border bg-sport-surface px-4 py-3 text-xs font-semibold">
                <card.icon size={16} className="shrink-0 text-sport-orange" />
                {card.text}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sport-orange px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-sport-green">
              {product.brand}
            </span>
            {product.bestseller && (
              <span className="rounded-full bg-sport-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest">
                Más vendido
              </span>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl uppercase leading-tight tracking-wide sm:text-4xl">
            {product.name}
          </h1>
          <div className="mt-3">
            <RatingSummary rating={rating} count={reviews} />
          </div>

          <div className="mt-5 flex items-end gap-3">
            <span className="font-display text-4xl leading-none tracking-wide">
              {formatPrice(product.price)}
            </span>
            {product.oldPrice && (
              <span className="pb-1 text-base text-gray-500 line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
            {discount && (
              <span className="mb-1 rounded-full bg-sport-green px-2 py-0.5 text-xs font-extrabold text-white">
                Ahorras {formatPrice((product.oldPrice ?? 0) - product.price)}
              </span>
            )}
          </div>
          <div className="mt-3">
            <LiveViewers productId={product.id} />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-gray-700">{product.desc}</p>
          {product.registroIsp && (
            <p className="mt-2 text-xs font-semibold text-gray-500">
              Reg. ISP N° {product.registroIsp}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {product.benefits.map((b) => (
              <span key={b} className="chip bg-sport-surface">
                ✓ {b}
              </span>
            ))}
          </div>

          {product.variants && product.variants.length > 0 && (
            <div className="mt-6">
              <p className="label">Sabor</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => setFlavor(v.name)}
                    aria-pressed={v.name === flavor}
                    className={cx(
                      'rounded-full border px-4 py-2 text-sm font-bold transition-all',
                      v.name === flavor
                        ? 'border-accent bg-sport-green text-white shadow-sm'
                        : 'border-sport-border bg-sport-card text-gray-900 hover:border-accent',
                    )}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-full border border-sport-border">
              <button
                type="button"
                onClick={() => setQty((v) => Math.max(1, v - 1))}
                aria-label="Disminuir cantidad"
                className="flex h-12 w-12 items-center justify-center rounded-l-full transition-colors hover:bg-sport-surface"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-bold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((v) => (stock > 0 ? Math.min(stock, v + 1) : v))}
                aria-label="Aumentar cantidad"
                className="flex h-12 w-12 items-center justify-center rounded-r-full transition-colors hover:bg-sport-surface"
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Stock disponible: <strong className="text-gray-900">{stock} uds.</strong>
            </p>
            <button
              type="button"
              onClick={() => toggleFavorite(product.id)}
              aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              className={`ml-auto flex h-12 w-12 items-center justify-center rounded-full border border-sport-border transition-colors ${
                fav ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart size={18} className={fav ? 'fill-red-500' : ''} />
            </button>
          </div>

          {stock <= 10 && (
            <div className="mt-4 max-w-xs">
              <StockUrgency stock={stock} variant="bar" />
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
          <p className="mt-3 text-center text-xs text-gray-500 sm:text-left">
            Envío gratis en metro sobre {formatPrice(getSettings().freeShippingFrom)}.
          </p>
        </div>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-3">
        <div className="rounded-3xl border border-sport-border p-6 lg:col-span-2">
          <SectionTitle>Detalles del producto</SectionTitle>
          <div className="space-y-6 text-sm leading-relaxed text-gray-700">
            <div>
              <h3 className="mb-1.5 font-bold text-gray-900">{isAccessory ? 'Cuidado y uso' : 'Modo de uso'}</h3>
              <p>{product.modoUso}</p>
            </div>
            <div>
              <h3 className="mb-1.5 font-bold text-gray-900">{isAccessory ? 'Detalles' : 'Ingredientes'}</h3>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {product.ingredientes.map((ing) => (
                  <li key={ing} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sport-orange" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-sport-border p-6">
          <SectionTitle>{isAccessory ? 'Especificaciones' : 'Nutrientes'}</SectionTitle>
          <ul className="divide-y divide-line">
            {product.nutrientes.map(([label, value]) => (
              <li key={label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-bold">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ProductReviews
        productSlug={product.slug}
        initialRating={product.rating}
        reviewCount={product.reviews}
      />

      {related.length > 0 && (
        <BuyTogether product={product} related={related} variantName={selected?.name} />
      )}

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
