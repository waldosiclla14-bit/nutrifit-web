'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Truck,
  ShoppingBag,
  BadgeCheck,
  Lock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { BUNDLES, PRODUCTS } from '@/data/seed';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import Stars from '@/components/ui/Stars';
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

const SOCIAL_PROOF = [
  { name: 'Matías R.', initials: 'MR' },
  { name: 'Camila F.', initials: 'CF' },
  { name: 'Jorge P.', initials: 'JP' },
  { name: 'Ana S.', initials: 'AS' },
];

export default function HeroSection() {
  const { addBundle, subtotal, freeShippingFrom } = useCart();
  const [flavor, setFlavor] = useState<Flavor>(FLAVORS[0]);
  const pack = BUNDLES.find((b) => b.id === 'pack-proteina-creatina');

  const whey = PRODUCTS.find((p) => p.id === 4);
  const creatina = PRODUCTS.find((p) => p.id === 7);
  const totalReviews = (whey?.reviews ?? 0) + (creatina?.reviews ?? 0);
  const avgRating =
    whey && creatina ? +((whey.rating + creatina.rating) / 2).toFixed(1) : 4.9;
  const stockLeft = (whey?.stock ?? 0) + (creatina?.stock ?? 0);

  const addPack = () => {
    if (!pack) return;
    addBundle(pack, { 4: flavor.name });
  };

  const remaining = Math.max(0, freeShippingFrom - subtotal);
  const pct = Math.min(100, Math.round((subtotal / freeShippingFrom) * 100));

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
            Tu proteína y creatina, en tu Metro <span className="text-sport-green">hoy</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 max-w-md text-[15px] leading-relaxed text-gray-500"
          >
            Suplementos originales con sello de garantía. Coordinas por WhatsApp y
            te los llevo a tu estación de Metro el mismo día.
          </motion.p>

          {/* Rating */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-5 flex flex-wrap items-center gap-3"
          >
            <div className="flex items-center gap-1.5">
              <Stars rating={avgRating} size={15} />
              <span className="text-sm font-bold">{avgRating}</span>
            </div>
            <span className="h-3.5 w-px bg-gray-100" />
            <span className="text-[13px] text-gray-400">
              {totalReviews.toLocaleString('es-CL')} reseñas
            </span>
            <span className="h-3.5 w-px bg-gray-100" />
            <span className="text-[13px] text-gray-400">
              +500 pedidos entregados
            </span>
          </motion.div>

          {/* Price */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-6 flex items-baseline gap-3"
          >
            <span className="font-display text-5xl tracking-wide sm:text-6xl">
              {formatPrice(PACK_PRICE)}
            </span>
            <span className="text-lg text-gray-400 line-through">
              {formatPrice(PACK_OLD)}
            </span>
            <span className="rounded-full bg-sport-orange/20 px-2.5 py-1 text-[11px] font-extrabold text-sport-orange ring-1 ring-sport-orange/40">
              -{OFF}% OFF
            </span>
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
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sport-orange opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sport-orange" />
            </span>
            <p className="text-[13px] font-semibold text-gray-600">
              ¡Quedan solo{' '}
              <span className="font-extrabold text-sport-orange">{stockLeft} unidades</span>{' '}
              en stock!
            </p>
          </motion.div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={addPack}
            className="group mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-sport-green text-base font-extrabold text-white shadow-sportGlow transition-colors hover:bg-sport-greenLight lg:max-w-md"
          >
            <ShoppingBag size={20} />
            Agregar al carrito · {formatPrice(PACK_PRICE)}
            <ChevronRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </motion.button>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-gray-500"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-sport-green" /> Garantía 30 días
            </span>
            <span className="h-3 w-px bg-gray-100" />
            <span className="flex items-center gap-1.5">
              <Lock size={13} className="text-sport-green" /> Pago seguro
            </span>
            <span className="h-3 w-px bg-gray-100" />
            <span className="flex items-center gap-1.5">
              <Truck size={13} className="text-sport-green" /> Envío gratis en Metro
            </span>
          </motion.div>

          {/* Free shipping progress */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-4 max-w-md"
          >
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-gray-400">
                {remaining > 0
                  ? `Te faltan ${formatPrice(remaining)} para envío gratis`
                  : '¡Tienes envío gratis!'}
              </span>
              <span className="font-bold text-sport-green">{pct}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className="h-full rounded-full bg-sport-green"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: 0.8 }}
              />
            </div>
          </motion.div>

          {/* Social proof avatars */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-6 flex items-center gap-3"
          >
            <div className="flex -space-x-2.5">
              {SOCIAL_PROOF.map((person, i) => (
                <div
                  key={person.name}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-extrabold text-white"
                  style={{
                    backgroundColor: ['#5DD62C', '#F97316', '#3B82F6', '#8B5CF6'][i],
                    zIndex: 4 - i,
                  }}
                  title={person.name}
                >
                  {person.initials}
                </div>
              ))}
            </div>
            <p className="text-[13px] text-gray-500">
              <span className="font-semibold text-gray-600">+500 deportistas</span>{' '}
              ya tienen su pack
            </p>
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

              {/* Glassmorphism badges */}
              <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
                <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 backdrop-blur-md">
                  <BadgeCheck size={13} className="text-sport-green" />
                  <span className="text-[11px] font-bold text-gray-900">
                    24g Proteína por Scoop
                  </span>
                </div>
              </div>

              <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
                <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 backdrop-blur-md">
                  <ShieldCheck size={13} className="text-sport-green" />
                  <span className="text-[11px] font-bold text-gray-900">
                    Productos originales
                  </span>
                </div>
              </div>

              {/* Same-day delivery badge */}
              <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-sport-green/30 bg-sport-green/15 px-3 py-1.5 text-[11px] font-extrabold text-sport-green backdrop-blur-md sm:bottom-4 sm:left-4">
                <Truck size={12} /> Entrega mismo día
              </span>
            </div>

            {/* OFF badge floating */}
            <span className="absolute -right-2 top-4 rounded-full border border-white/10 bg-sport-orange px-3 py-1.5 text-[12px] font-extrabold text-white shadow-lg sm:-right-3 sm:top-6">
              -{OFF}% OFF
            </span>

            {/* Metro badge floating */}
            <span className="absolute -bottom-3 left-4 flex items-center gap-1.5 rounded-full border border-gray-200 bg-sport-bg px-3.5 py-1.5 text-[12px] font-bold text-white shadow-lg sm:-bottom-4">
              <Truck size={13} className="text-sport-green" /> Entrega en Metro
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
