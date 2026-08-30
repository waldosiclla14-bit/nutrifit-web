'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShieldCheck, Star, Truck, ShoppingBag, BadgeCheck, Lock } from 'lucide-react';
import { BUNDLES, PRODUCTS } from '@/data/seed';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import Reveal from '@/components/ui/Reveal';
import Stars from '@/components/ui/Stars';
import FlashSaleCountdown from '@/components/home/FlashSaleCountdown';
import { BRAND } from '@/data/seed';

type Flavor = { name: string; color: string; image: string };

const FLAVORS: Flavor[] = [
  { name: 'Vainilla', color: '#EFE6CD', image: '/img/producto1.webp' },
  { name: 'Frutilla', color: '#F6C7CF', image: '/img/producto2.jpg' },
  { name: 'Chocolate', color: '#7A5233', image: '/img/producto5.jpg' },
  { name: 'Galleta', color: '#D9B98C', image: '/img/producto4.webp' },
  { name: 'Manjar', color: '#F2C94C', image: '/img/producto6.webp' },
];

const PACK_OLD = 30000;
const PACK_PRICE = 27500;
const OFF = Math.round((1 - PACK_PRICE / PACK_OLD) * 100);

export default function Hero() {
  const { addBundle, subtotal, freeShippingFrom } = useCart();
  const [flavor, setFlavor] = useState<Flavor>(FLAVORS[0]);
  const pack = BUNDLES.find((b) => b.id === 'pack-proteina-creatina');

  const whey = PRODUCTS.find((p) => p.id === 4);
  const creatina = PRODUCTS.find((p) => p.id === 7);
  const totalReviews = (whey?.reviews ?? 0) + (creatina?.reviews ?? 0);
  const avgRating = whey && creatina ? +((whey.rating + creatina.rating) / 2).toFixed(1) : 4.9;
  const stockLeft = (whey?.stock ?? 0) + (creatina?.stock ?? 0);

  const addPack = () => {
    if (!pack) return;
    addBundle(pack, { 4: flavor.name });
  };

  return (
    <section className="relative overflow-hidden bg-dark text-white">
      <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-lime-500/10 blur-[110px]" />
      <div className="hero-grid absolute inset-0 opacity-60" />

      <div className="container-px relative grid items-center gap-10 py-14 lg:min-h-screen lg:grid-cols-2 lg:gap-14 lg:py-24">
        {/* Imagen */}
        <div className="lg:order-2">
          <div className="block">
            <div className="relative mx-auto max-w-xs sm:max-w-md lg:max-w-lg">
              <div className="absolute inset-0 -z-10 rounded-full bg-accent/20 blur-[90px]" />
              <div className="relative rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="relative flex items-center justify-center gap-1.5">
                  <div className="relative aspect-[4/5] min-w-0 flex-1 overflow-hidden rounded-2xl bg-white/[0.04]">
                    <Image
                      key={flavor.name}
                      src={flavor.image}
                      alt={`FullEnergic Whey 1kg, sabor ${flavor.name}`}
                      fill
                      sizes="(max-width: 1024px) 40vw, 20vw"
                      priority
                      className="object-contain p-2"
                    />
                  </div>
                  <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-dark text-lg font-extrabold text-accent shadow-soft">
                    +
                  </span>
                  <div className="relative aspect-[4/5] min-w-0 flex-1 overflow-hidden rounded-2xl bg-white/[0.04]">
                    <Image
                      src="/img/producto34.jpg"
                      alt="Eco Naturales Creatina Monohidratada 300g"
                      fill
                      sizes="(max-width: 1024px) 40vw, 20vw"
                      className="object-contain p-2"
                    />
                  </div>
                </div>
                <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold text-ink shadow-glow">
                  <BadgeCheck size={14} /> 100% original
                </span>
              </div>
              <span className="absolute -right-2 top-6 rounded-full bg-paper px-3 py-1.5 text-xs font-extrabold text-ink shadow-soft">
                -{OFF}% OFF
              </span>
              <span className="absolute -bottom-3 left-4 flex items-center gap-1.5 rounded-full bg-dark px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/25">
                <Truck size={13} className="text-accent" /> Entrega en Metro
              </span>
            </div>
          </div>
        </div>

        {/* Texto */}
        <div className="lg:order-1">
          <Reveal>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-accent">
              Pack más vendido · proteína + creatina
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Suplementos 100% originales. Te los entrego{' '}
              <span className="text-accent">mañana</span> en tu Metro.
            </h1>
          </Reveal>

          {/* Rating bar */}
          <Reveal delay={120}>
            <div className="mt-4 flex items-center gap-3">
              <Stars rating={avgRating} size={16} />
              <span className="text-sm font-bold text-white">{avgRating}</span>
              <span className="text-sm text-white/50">({totalReviews.toLocaleString('es-CL')} reseñas)</span>
              <span className="hidden h-4 w-px bg-white/20 sm:block" />
              <span className="hidden text-sm text-white/50 sm:block">+500 pedidos entregados</span>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
              Sin envíos caros, sin esperar courier. Coordina por WhatsApp en 2 min.
            </p>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-6 flex items-center gap-3">
              <span className="font-display text-5xl tracking-wide text-white">$27.500</span>
              <span className="text-lg text-white/45 line-through">$30.000</span>
              <span className="rounded-full bg-accent/20 px-2.5 py-1 text-xs font-extrabold text-accent ring-1 ring-accent/40">
                -{OFF}% OFF
              </span>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-3">
              <FlashSaleCountdown />
            </div>
          </Reveal>

          {/* Selector de sabor */}
          <Reveal delay={220}>
            <div className="mt-6">
              <p className="mb-2.5 text-sm font-bold text-white/85">Elige tu sabor</p>
              <div className="flex flex-wrap gap-2.5">
                {FLAVORS.map((f) => {
                  const active = f.name === flavor.name;
                  return (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setFlavor(f)}
                      aria-pressed={active}
                      aria-label={`Sabor ${f.name}`}
                      className={`flex items-center gap-2 rounded-full py-2 pl-2 pr-3.5 text-sm font-bold transition-all ${
                        active ? 'ring-2 ring-paper shadow-glow' : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: f.color, color: f.name === 'Chocolate' ? '#fff' : '#111' }}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-black/20"
                        style={{ backgroundColor: f.color }}
                        aria-hidden="true"
                      />
                      {f.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </Reveal>

          {/* Stock urgency */}
          <Reveal delay={240}>
            <div className="mt-4 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <p className="text-sm font-semibold text-red-400">
                ¡Quedan solo <span className="text-white">{stockLeft} unidades</span> en stock!
              </p>
            </div>
          </Reveal>

          {/* CTA principal */}
          <Reveal delay={260}>
            <button
              type="button"
              onClick={addPack}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent text-base font-extrabold text-ink transition-transform active:scale-[0.98] lg:max-w-md"
            >
              <ShoppingBag size={20} />
              Agregar al carrito · {formatPrice(PACK_PRICE)}
            </button>
          </Reveal>

          {/* Trust + payment */}
          <Reveal delay={300}>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/60">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-accent" /> Garantía 30 días
              </span>
              <span className="h-3 w-px bg-white/20" />
              <span className="flex items-center gap-1.5">
                <Lock size={13} className="text-accent" /> Pago seguro
              </span>
              <span className="h-3 w-px bg-white/20" />
              <span className="flex items-center gap-1.5">
                <Truck size={13} className="text-accent" /> Envío gratis en Metro
              </span>
            </div>
          </Reveal>

          {/* Free shipping progress */}
          <Reveal delay={320}>
            {(() => {
              const remaining = Math.max(0, freeShippingFrom - subtotal);
              const pct = Math.min(100, Math.round((subtotal / freeShippingFrom) * 100));
              return (
                <div className="mt-4 max-w-md">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">
                      {remaining > 0
                        ? `Te faltan ${formatPrice(remaining)} para envío gratis`
                        : '¡Tienes envío gratis!'}
                    </span>
                    <span className="font-bold text-accent">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
