'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { PRODUCTS } from '@/data/seed';
import ProductCard from '@/components/product/ProductCard';
import Reveal from '@/components/ui/Reveal';

export default function CategoryCarousel({
  category,
  eyebrow,
  title,
  highlight,
  linkLabel,
}: {
  category: string;
  eyebrow: string;
  title: string;
  highlight: string;
  linkLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const items = PRODUCTS.filter((p) => p.category === category);

  if (items.length === 0) return null;

  const scrollByDir = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="bg-soft py-14 lg:py-[100px]" id={`cat-${category}`}>
      <div className="container-px">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="section-label">{eyebrow}</p>
            <h2 className="section-title">
              {title} <span className="text-accentDeep">{highlight}</span>
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
          {items.map((product) => (
            <div key={product.id} className="w-[260px] shrink-0 snap-start sm:w-[300px]">
              <ProductCard product={product} />
            </div>
          ))}
          <Link
            href={`/productos?cat=${category}`}
            className="group flex w-[260px] shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-line bg-paper/60 p-6 text-center transition-colors hover:border-accent hover:bg-paper sm:w-[300px]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white transition-colors group-hover:bg-accent group-hover:text-ink">
              <ArrowRight size={24} className="transition-transform group-hover:translate-x-1" />
            </span>
            <span className="font-display text-lg uppercase tracking-wide">Ver todos</span>
            <span className="text-sm text-muted">{linkLabel}</span>
          </Link>
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
