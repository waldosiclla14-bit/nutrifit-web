'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, BadgeCheck, Camera, ExternalLink } from 'lucide-react';

const REVIEWS = [
  {
    id: 1,
    name: 'Matías R.',
    initials: 'MR',
    color: '#5DD62C',
    rating: 5,
    text: 'La whey de vainilla es la primera que se me disuelve bien solo con agua, sin grumos y sin ese sabor químico. Me la dejaron en Los Leones al día siguiente.',
    verified: true,
    tag: 'Whey Vainilla',
  },
  {
    id: 2,
    name: 'Camila F.',
    initials: 'CF',
    color: '#F97316',
    rating: 5,
    text: 'La creatina es original, con su código de verificación en la lata. Llevo un mes usándola y noté más aguante en los WOD. Más barata que en las tiendas grandes.',
    verified: true,
    tag: 'Creatina 300g',
  },
  {
    id: 3,
    name: 'Jorge P.',
    initials: 'JP',
    color: '#3B82F6',
    rating: 5,
    text: 'Pedí el pack de proteína + creatina y llegó todo bien sellado con sus precintos. La de frutilla es buenísima, ya le pasé el dato a mi hermano.',
    verified: true,
    tag: 'Pack Proteína + Creatina',
  },
  {
    id: 4,
    name: 'Ana S.',
    initials: 'AS',
    color: '#8B5CF6',
    rating: 5,
    text: 'Super rápida la entrega, me avisaron por WhatsApp y coordinamos al tiro. Los productos son originales, se nota en la calidad del sello.',
    verified: true,
    tag: 'Entrega Express',
  },
  {
    id: 5,
    name: 'Felipe M.',
    initials: 'FM',
    color: '#EC4899',
    rating: 5,
    text: 'Llevo 3 meses comprando aquí. La berberina me ayudó con la digestión y la omega 3 es de las mejores que he probado. 100% recomendado.',
    verified: true,
    tag: 'Berberina + Omega 3',
  },
  {
    id: 6,
    name: 'Constanza V.',
    initials: 'CV',
    color: '#14B8A6',
    rating: 5,
    text: 'Pagué con transferencia y me confirmaron al toque. La proteína vegan cookies & cream es riquísima, mejor que otras que probé. El empaque super cuidado.',
    verified: true,
    tag: 'Whey Vegana',
  },
  {
    id: 7,
    name: 'Rodrigo L.',
    initials: 'RL',
    color: '#F59E0B',
    rating: 4,
    text: 'Buen precio y entrega rápida. El omega 3 no deja ese regusto tan fuerte como otros. Lo único: demoré un poco en coordinar la hora de entrega por metro.',
    verified: true,
    tag: 'Omega 3',
  },
  {
    id: 8,
    name: 'Valentina M.',
    initials: 'VM',
    color: '#6366F1',
    rating: 5,
    text: 'Compré por primera vez y quedaré-cliente fija. La colágeno hidrolizada se nota de calidad. Me la dejaron en Tobalaba y todo perfecto. Los recomiendo.',
    verified: true,
    tag: 'Colágeno Hidrolizada',
  },
  {
    id: 9,
    name: 'Francisco G.',
    initials: 'FG',
    color: '#EF4444',
    rating: 5,
    text: 'La pre-entreno FullEnergic es potentísima. Me la recomendaron por WhatsApp y no me arrepentí. Pago en efectivo en la estación, súper práctico.',
    verified: true,
    tag: 'Pre-entreno',
  },
  {
    id: 10,
    name: 'Isidora T.',
    initials: 'IT',
    color: '#8B5CF6',
    rating: 5,
    text: 'La glutamina con electrolíticos me ayudó caleta con la recuperación post-crossfit. Producto original y buen precio. Ya hice mi segunda compra.',
    verified: true,
    tag: 'Glutamina + Electrolíticos',
  },
];

export default function UGCProof() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = dir === 'left' ? -340 : 340;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-sport-surface py-14 lg:py-[100px]">
      <div className="container-px">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-end justify-between"
        >
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-sport-green">
              Opiniones reales
            </p>
            <h2 className="mt-3 font-display text-[28px] uppercase tracking-wide text-gray-900 lg:text-[36px]">
              Lo que dicen nuestros clientes
            </h2>
            <a
              href="https://share.google/9QJjdmhKNR05MTyCM"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-sport-green"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Reseñas de Google
              <ExternalLink size={10} />
            </a>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              onClick={() => scroll('left')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-sport-border bg-sport-card text-gray-500 transition-colors hover:border-sport-green hover:text-white"
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-sport-border bg-sport-card text-gray-500 transition-colors hover:border-sport-green hover:text-white"
              aria-label="Siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="mt-8 flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory"
        >
          {REVIEWS.map((review, i) => (
            <motion.article
              key={review.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="min-w-[280px] max-w-[320px] flex-1 snap-start rounded-2xl border border-sport-border/50 bg-sport-card/60 p-5 backdrop-blur transition-colors hover:border-sport-green/40"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-extrabold text-white"
                  style={{ backgroundColor: review.color }}
                >
                  {review.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-gray-900">{review.name}</p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <Star
                        key={j}
                        size={11}
                        className="fill-sport-orange text-sport-orange"
                      />
                    ))}
                  </div>
                </div>
                {review.verified && (
                  <span className="flex items-center gap-1 rounded-full bg-sport-green/15 px-2 py-0.5 text-[10px] font-bold text-sport-green">
                    <BadgeCheck size={10} /> Verificada
                  </span>
                )}
              </div>

              {/* Tag */}
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-sport-green/10 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                  <Camera size={10} />
                  {review.tag}
                </span>
              </div>

              {/* Text */}
              <p className="mt-3 text-[13px] leading-relaxed text-gray-500">
                &ldquo;{review.text}&rdquo;
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
