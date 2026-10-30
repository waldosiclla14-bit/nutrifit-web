'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
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
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-sport-green">
              Pack más vendido · proteína + creatina
            </p>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 max-w-xl font-display text-[2.6rem] uppercase leading-[0.95] tracking-wide sm:text-6xl lg:text-[4.2rem]"
          >
            Whey + Creatina{' '}
            <span className="text-sport-green">originales</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 max-w-md text-[15px] leading-relaxed text-gray-500"
          >
            Pack más vendido con sello de garantía. Coordinas por WhatsApp y te lo
            llevamos a tu estación de Metro.
          </motion.p>

          {/* Rating: solo si los productos del pack tienen reseñas */}
          {ratings && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-5 flex flex-wrap items-center gap-3"
            >
              <div className="flex items-center gap-1.5">
                <Stars rating={ratings.rating} size={15} />
                <span className="text-sm font-bold">{ratings.rating.toFixed(1)}</span>
              </div>
              <span className="h-3.5 w-px bg-gray-100" />
              <span className="text-[13px] text-gray-400">
                {ratings.count.toLocaleString('es-CL')} reseñas
              </span>
            </motion.div>
          )}

          {/* Price: el "antes" es la suma de los precios actuales del pack */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-6 flex items-baseline gap-3"
          >
            <span className="font-display text-5xl tracking-wide sm:text-6xl">
              {formatPrice(pricing.price)}
            </span>
            {pricing.saving > 0 && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(pricing.sum)}
              </span>
            )}
            {pricing.percent > 0 && (
              <span className="rounded-full bg-sport-orange/20 px-2.5 py-1 text-[11px] font-extrabold text-sport-orange ring-1 ring-sport-orange/40">
                -{pricing.percent}% OFF
              </span>
            )}
          </motion.div>

          {/* Flavor picker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6"
          >
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
                      active
                        ? 'ring-2 ring-white shadow-lg'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: f.color,
                      color: f.name === 'Chocolate' ? '#fff' : '#111',
                    }}
                  >
                    {active && (
                      <motion.span
                        layoutId="flavor-check"
                        className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sport-green text-[8px] text-white"
                      >
                        ✓
                      </motion.span>
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
          </motion.div>

          {/* Stock urgency */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-4 flex items-center gap-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sport-green opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sport-green" />
            </span>
            <p className="text-[13px] font-semibold text-gray-600">
              {siteConfig.delivery.coverage}
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center lg:max-w-xl"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={addPack}
              className="group flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-sport-green text-base font-extrabold text-white shadow-sportGlow transition-colors hover:bg-sport-greenLight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto sm:px-8"
            >
              <ShoppingBag size={20} />
              Agregar · {formatPrice(pricing.price)}
              <ChevronRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </motion.button>

            <button
              type="button"
              onClick={addPack}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full border-2 border-sport-green bg-white text-base font-extrabold text-sport-green transition-colors hover:bg-sport-green/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto sm:px-8"
            >
              <MessageCircle size={20} />
              Comprar por WhatsApp
            </button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-gray-500"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-sport-green" /> {siteConfig.warranty.short}
            </span>
            <span className="h-3 w-px bg-gray-100" />
            <span className="flex items-center gap-1.5">
              <Lock size={13} className="text-sport-green" /> {siteConfig.payment.label}
            </span>
            <span className="h-3 w-px bg-gray-100" />
            <span className="flex items-center gap-1.5">
              <Truck size={13} className="text-sport-green" /> Entrega en Metro o domicilio
            </span>
          </motion.div>
        </div>

        {/* ─── IMAGE COLUMN ─── */}
        <div className="order-1 lg:order-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mx-auto max-w-xs sm:max-w-sm lg:max-w-md"
          >
            {/* Glow behind */}
            <div className="absolute inset-0 -z-10 rounded-full bg-sport-green/15 blur-[100px]" />

            {/* Main card with glassmorphism */}
            <div className="relative rounded-[2rem] border border-gray-200 bg-gray-50 p-5 backdrop-blur-xl sm:p-6">
              {/* Product images */}
              <div className="relative flex items-center justify-center gap-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={flavor.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="relative aspect-[4/5] min-w-0 flex-1 overflow-hidden rounded-2xl bg-gray-50"
                  >
                    <Image
                      src={flavor.image}
                      alt={`FullEnergic Whey 1kg, sabor ${flavor.name}`}
                      fill
                      sizes="(max-width: 1024px) 40vw, 22vw"
                      priority
                      className="object-contain p-2"
                    />
                  </motion.div>
                </AnimatePresence>

                <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-sport-bg text-lg font-extrabold text-sport-green shadow-lg">
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
              <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-sport-green/30 bg-sport-green/15 px-3 py-1.5 text-[11px] font-extrabold text-sport-green backdrop-blur-md sm:bottom-4 sm:left-4">
                <Truck size={12} /> Retiro en Metro
              </span>
            </div>

            {/* OFF badge floating */}
            {pricing.percent > 0 && (
              <span className="absolute -right-2 top-4 rounded-full border border-white/10 bg-sport-orange px-3 py-1.5 text-[12px] font-extrabold text-white shadow-lg sm:-right-3 sm:top-6">
                -{pricing.percent}% OFF
              </span>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
