'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '@/types';
import Reveal from '@/components/ui/Reveal';
import BestSellerCard from '@/components/home/BestSellerCard';

/**
 * Carrusel horizontal reutilizable (scroll-snap nativo). Se usa en la home para
 * las secciones curadas: más vendidos, ofertas y recién llegados.
 */
export default function HomeCarousel({
  id,
  eyebrow,
  title,
  highlight,
  subtitle,
  products,
  surface = true,
}: {
  id: string;
  eyebrow: string;
  title: string;
  highlight?: string;
  subtitle: string;
  products: Product[];
  surface?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  if (products.length === 0) return null;

  const Chevron = ({ dir }: { dir: number }) => (
    <button
      type="button"
      onClick={() => scroll(dir)}
      aria-label={dir < 0 ? 'Anterior' : 'Siguiente'}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-sport-border bg-sport-card text-gray-500 transition-colors hover:border-sport-green hover:text-sport-green"
    >
      {dir < 0 ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  );

  return (
    <section className={surface ? 'bg-sport-surface py-14 lg:py-[100px]' : 'py-14 lg:py-[100px]'} id={id}>
      <div className="container-px">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-sport-green">{eyebrow}</p>
            <h2 className="mt-2 font-display text-[28px] uppercase leading-tight tracking-wide text-gray-900 lg:text-[36px]">
              {title} {highlight && <span className="text-sport-green">{highlight}</span>}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <Chevron dir={-1} />
            <Chevron dir={1} />
          </div>
        </Reveal>

        <div
          ref={trackRef}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2"
        >
          {products.map((product) => (
            <div key={product.id} className="w-[260px] shrink-0 snap-start sm:w-[280px]">
              <BestSellerCard product={product} />
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center gap-2 sm:hidden">
          <Chevron dir={-1} />
          <Chevron dir={1} />
        </div>
      </div>
    </section>
  );
}
