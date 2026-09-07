'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, BadgeCheck, Camera } from 'lucide-react';

const REVIEWS = [
  {
    id: 1,
    name: 'Matías R.',
    initials: 'MR',
    color: '#10B981',
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
];

export default function UGCProof() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = dir === 'left' ? -320 : 320;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-sport-surface py-16 sm:py-20">
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
            <h2 className="mt-3 font-display text-4xl uppercase tracking-wide text-white sm:text-5xl">
              Lo que dicen nuestros clientes
            </h2>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              onClick={() => scroll('left')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-sport-border bg-sport-card text-white/60 transition-colors hover:border-sport-green hover:text-white"
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-sport-border bg-sport-card text-white/60 transition-colors hover:border-sport-green hover:text-white"
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
                  <p className="text-[13px] font-bold text-white">{review.name}</p>
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
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/50">
                  <Camera size={10} />
                  {review.tag}
                </span>
              </div>

              {/* Text */}
              <p className="mt-3 text-[13px] leading-relaxed text-white/60">
                &ldquo;{review.text}&rdquo;
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
