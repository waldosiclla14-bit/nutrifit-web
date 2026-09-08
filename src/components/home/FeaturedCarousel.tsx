'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PRODUCTS } from '@/data/seed';
import Reveal from '@/components/ui/Reveal';
import BestSellerCard from '@/components/home/BestSellerCard';

const TOP_IDS = [4, 7, 6, 9, 10, 13, 15, 22];

export default function FeaturedCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const items = TOP_IDS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean) as typeof PRODUCTS;

  const scroll = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  return (
    <section className="bg-soft py-14 lg:py-[100px]" id="destacados">
      <div className="container-px">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="section-label">MÁS VENDIDOS</p>
            <h2 className="section-title">
              Top <span className="text-accentDeep">ventas</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Los productos favoritos de nuestros clientes en Santiago.
            </p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Anterior"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Siguiente"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </Reveal>

        <div
          ref={trackRef}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2"
        >
          {items.map((product) => (
            <div key={product.id} className="w-[260px] shrink-0 snap-start sm:w-[280px]">
              <BestSellerCard product={product} />
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Anterior"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Siguiente"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
