'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ShieldCheck,
  Truck,
  ShoppingBag,
  Lock,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { BUNDLES, PRODUCTS } from '@/data/seed';
import { useCart } from '@/context/CartContext';
import { bundlePricing, formatPrice } from '@/lib/utils';
import { bundleComponents } from '@/lib/bundles';
import { summarizeBundleRatings } from '@/lib/ratings';
import { siteConfig } from '@/lib/site-config';
import Stars from '@/components/ui/Stars';

type Flavor = { name: string; color: string; image: string };

const FLAVORS: Flavor[] = [
  { name: 'Vainilla', color: '#EFE6CD', image: '/img/producto1.webp' },
  { name: 'Frutilla', color: '#F6C7CF', image: '/img/producto2.jpg' },
  { name: 'Chocolate', color: '#7A5233', image: '/img/producto5.jpg' },
  { name: 'Galleta', color: '#D9B98C', image: '/img/producto4.webp' },
  { name: 'Manjar', color: '#F2C94C', image: '/img/producto6.webp' },
];

export default function HeroSection() {
  const { addBundle } = useCart();
  const [flavor, setFlavor] = useState<Flavor>(FLAVORS[0]);
  const pack = BUNDLES.find((b) => b.id === 'pack-proteina-creatina');
  const resolve = (id: number) => PRODUCTS.find((p) => p.id === id);

  // Precio y reseñas se calculan con los productos que el pack realmente
  // contiene (whey + creatina Eco Naturales), no con ids escritos a mano.
  const packProducts = pack ? bundleComponents(pack, resolve).map((it) => it.product) : [];
  const pricing = pack
    ? bundlePricing(pack, resolve)
    : { sum: 0, price: 0, saving: 0, percent: 0 };
  const ratings = summarizeBundleRatings(packProducts, siteConfig.reviews.minCount);

  const addPack = () => {
    if (!pack) return;
    addBundle(pack, { 4: flavor.name });
  };

  return (
    <section className="relative overflow-hidden bg-sport-bg text-gray-900">
      {/* Decorative blurs */}
      <div className="pointer-events-none absolute -right-32 -top-40 h-[500px] w-[500px] rounded-full bg-sport-green/10 blur-[160px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-sport-green/5 blur-[120px]" />
      <div className="hero-grid absolute inset-0 opacity-40" />

      <div className="container-px relative grid items-center gap-10 py-12 lg:min-h-screen lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-0">
        {/* ─── TEXT COLUMN ─── */}
        <div className="order-2 lg:order-1">
          <div className="fade-up">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-sport-greenText">
              Pack más vendido · proteína + creatina
            </p>
          </div>

          <h1
            className="fade-up mt-4 max-w-xl font-display text-[2.6rem] uppercase leading-[0.95] tracking-wide sm:text-6xl lg:text-[4.2rem]"
            style={{ animationDelay: '100ms' }}
          >
            Whey + Creatina <span className="text-sport-greenText">originales</span>
          </h1>

          <p
            className="fade-up mt-4 max-w-md text-[15px] leading-relaxed text-gray-500"
            style={{ animationDelay: '200ms' }}
          >
            Pack más vendido con sello de garantía. Coordinas por WhatsApp y te lo
            llevamos a tu estación de Metro.
          </p>

          {/* Rating: solo si los productos del pack tienen reseñas */}
          {ratings && (
            <div
              className="fade-up mt-5 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '300ms' }}
            >
              <div className="flex items-center gap-1.5">
                <Stars rating={ratings.rating} size={15} />
                <span className="text-sm font-bold">{ratings.rating.toFixed(1)}</span>
              </div>
              <span className="h-3.5 w-px bg-gray-100" />
              <span className="text-[13px] text-gray-500">
                {ratings.count.toLocaleString('es-CL')} reseñas
              </span>
            </div>
          )}

          {/* Price: el "antes" es la suma de los precios actuales del pack */}
          <div
            className="fade-up mt-6 flex items-baseline gap-3"
            style={{ animationDelay: '350ms' }}
          >
            <span className="font-display text-5xl tracking-wide sm:text-6xl">
              {formatPrice(pricing.price)}
            </span>
            {pricing.saving > 0 && (
              <span className="text-lg text-gray-500 line-through">
                {formatPrice(pricing.sum)}
              </span>
            )}
            {pricing.percent > 0 && (
              <span className="rounded-full bg-sport-orange/20 px-2.5 py-1 text-[11px] font-extrabold text-[#9A3412] ring-1 ring-sport-orange/40">
                -{pricing.percent}% OFF
              </span>
            )}
          </div>

          {/* Flavor picker */}
          <div className="fade-up mt-6" style={{ animationDelay: '400ms' }}>
            <p className="mb-2.5 text-[13px] font-bold text-gray-600">Elige tu sabor</p>
            <div className="flex flex-wrap gap-2">
              {FLAVORS.map((f) => {
                const active = f.name === flavor.name;
                return (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setFlavor(f)}
                    aria-pressed={active}
                    aria-label={`Sabor ${f.name}`}
                    className={`relative flex items-center gap-2 rounded-full py-2 pl-2.5 pr-3.5 text-[13px] font-bold transition-all ${
                      active ? 'ring-2 ring-white shadow-lg' : 'ring-1 ring-black/15 hover:ring-black/40'
                    }`}
                    style={{
                      backgroundColor: f.color,
                      color: f.name === 'Chocolate' ? '#fff' : '#111',
                    }}
                  >
                    {active && (
                      <span className="pop-in absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sport-green text-[8px] text-ink">
                        ✓
                      </span>
                    )}
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/15"
                      style={{ backgroundColor: f.color }}
                      aria-hidden="true"
                    />
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stock urgency */}
          <div
            className="fade-up mt-4 flex items-center gap-2"
            style={{ animationDelay: '450ms' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sport-green opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sport-green" />
            </span>
            <p className="text-[13px] font-semibold text-gray-600">
              {siteConfig.delivery.coverage}
            </p>
          </div>

          {/* CTA */}
          <div
            className="fade-up mt-5 flex flex-col gap-3 sm:flex-row sm:items-center lg:max-w-xl"
            style={{ animationDelay: '500ms' }}
          >
            <button
              type="button"
              onClick={addPack}
              className="group flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-sport-green text-base font-extrabold text-ink shadow-sportGlow transition-colors hover:bg-sport-greenLight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:bg-sport-greenLight sm:w-auto sm:px-8"
            >
              <ShoppingBag size={20} />
              Agregar · {formatPrice(pricing.price)}
              <ChevronRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            <button
              type="button"
              onClick={addPack}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full border-2 border-sport-green bg-white text-base font-extrabold text-sport-greenText transition-colors hover:bg-sport-green/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto sm:px-8"
            >
              <MessageCircle size={20} />
              Comprar por WhatsApp
            </button>
          </div>

          {/* Trust badges */}
          <div
            className="fade-up mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-gray-500"
            style={{ animationDelay: '600ms' }}
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-sport-greenText" /> {siteConfig.warranty.short}
            </span>
            <span className="h-3 w-px bg-gray-100" />
            <span className="flex items-center gap-1.5">
              <Lock size={13} className="text-sport-greenText" /> {siteConfig.payment.label}
            </span>
            <span className="h-3 w-px bg-gray-100" />
            <span className="flex items-center gap-1.5">
              <Truck size={13} className="text-sport-greenText" /> Entrega en Metro o domicilio
            </span>
          </div>
        </div>

        {/* ─── IMAGE COLUMN ─── */}
        <div className="order-1 lg:order-2">
          <div
            className="fade-scale-in relative mx-auto max-w-xs sm:max-w-sm lg:max-w-md"
            style={{ animationDuration: '800ms', animationDelay: '200ms' }}
          >
            {/* Glow behind */}
            <div className="absolute inset-0 -z-10 rounded-full bg-sport-green/15 blur-[100px]" />

            {/* Main card with glassmorphism */}
            <div className="relative rounded-[2rem] border border-gray-200 bg-gray-50 p-5 backdrop-blur-xl sm:p-6">
              {/* Product images */}
              <div className="relative flex items-center justify-center gap-2">
                <div
                  key={flavor.name}
                  className="fade-scale-in relative aspect-[4/5] min-w-0 flex-1 overflow-hidden rounded-2xl bg-gray-50"
                >
                  <Image
                    src={flavor.image}
                    alt={`FullEnergic Whey 1kg, sabor ${flavor.name}`}
                    fill
                    sizes="(max-width: 1024px) 40vw, 22vw"
                    priority
                    className="object-contain p-2"
                  />
                </div>

                <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-sport-bg text-lg font-extrabold text-sport-greenText shadow-lg">
                  +
                </span>

                <div className="relative aspect-[4/5] min-w-0 flex-1 overflow-hidden rounded-2xl bg-gray-50">
                  <Image
                    src="/img/producto34.jpg"
                    alt="Eco Naturales Creatina Monohidratada 300g"
                    fill
                    sizes="(max-width: 1024px) 40vw, 22vw"
                    className="object-contain p-2"
                  />
                </div>
              </div>

              {/* Same-day delivery badge */}
              <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-sport-green/30 bg-sport-green/15 px-3 py-1.5 text-[11px] font-extrabold text-sport-greenText backdrop-blur-md sm:bottom-4 sm:left-4">
                <Truck size={12} /> Retiro en Metro
              </span>
            </div>

            {/* OFF badge floating */}
            {pricing.percent > 0 && (
              <span className="absolute -right-2 top-4 rounded-full border border-white/10 bg-sport-orange px-3 py-1.5 text-[12px] font-extrabold text-ink shadow-lg sm:-right-3 sm:top-6">
                -{pricing.percent}% OFF
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
