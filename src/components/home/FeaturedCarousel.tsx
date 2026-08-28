'use client';

import { useState } from 'react';
import { PRODUCTS } from '@/data/seed';
import Reveal from '@/components/ui/Reveal';
import BestSellerCard from '@/components/home/BestSellerCard';
import BestSellerCTA from '@/components/home/BestSellerCTA';

type Filter = { key: string; label: string };

const FILTERS: Filter[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'proteinas', label: '💪 Whey' },
  { key: 'creatinas', label: '⚡ Creatina' },
  { key: 'bienestar', label: '🧠 Bienestar' },
  { key: 'vitaminas', label: '💊 Vitaminas' },
  { key: 'accesorios', label: '🥤 Shakers' },
];

// Productos populares por categoría, para que cada filtro muestre resultados útiles.
const POOL_BY_CATEGORY: Record<string, number[]> = {
  proteinas: [4, 6, 32, 33, 34, 36, 37],
  creatinas: [7, 22, 31],
  bienestar: [9, 10, 11, 13, 14, 16, 21, 24, 26],
  vitaminas: [15, 20, 28],
  accesorios: [35],
};

export default function FeaturedCarousel() {
  const [active, setActive] = useState('todos');

  const poolIds =
    active === 'todos' ? Object.values(POOL_BY_CATEGORY).flat() : POOL_BY_CATEGORY[active] ?? [];
  const visible = poolIds
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <section className="bg-soft py-14" id="destacados">
      <div className="container-px">
        <Reveal className="mb-8">
          <p className="section-label">DESTACADOS</p>
          <h2 className="section-title">
            Encuentra lo que <span className="text-accentDeep">necesitas</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Filtra por categoría y pide directo por WhatsApp.
          </p>
        </Reveal>

        <div className="mb-8 flex flex-wrap gap-2.5" role="group" aria-label="Filtrar por categoría">
          {FILTERS.map((f) => {
            const isActive = f.key === active;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setActive(f.key)}
                aria-pressed={isActive}
                className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-ink text-paper shadow-glow'
                    : 'bg-paper text-ink ring-1 ring-line hover:ring-accent'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((product) => (
            <BestSellerCard key={product.id} product={product} />
          ))}
        </div>

        <BestSellerCTA />
      </div>
    </section>
  );
}
