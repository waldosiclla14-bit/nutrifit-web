'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PRODUCTS } from '@/data/seed';
import ProductCard from '@/components/product/ProductCard';
import Reveal from '@/components/ui/Reveal';

export default function FeaturedCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const featured = PRODUCTS.filter((p) => p.bestseller);

  const scrollByDir = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="bg-soft py-14" id="destacados">
      <div className="container-px">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="section-label">DESTACADOS</p>
            <h2 className="section-title">
              Más <span className="text-accentDeep">vendidos</span>
            </h2>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollByDir(-1)}
              aria-label="Anterior"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollByDir(1)}
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
          {featured.map((product) => (
            <div key={product.id} className="w-[260px] shrink-0 snap-start sm:w-[300px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center sm:hidden">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollByDir(-1)}
              aria-label="Anterior"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollByDir(1)}
              aria-label="Siguiente"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
