'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { PRODUCTS } from '@/data/seed';
import Reveal from '@/components/ui/Reveal';
import BestSellerCard from '@/components/home/BestSellerCard';
import BestSellerCTA from '@/components/home/BestSellerCTA';

const TOP_SELLER_IDS = [4, 7, 31, 9, 22];

export default function FeaturedCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const featured = TOP_SELLER_IDS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );

  const scrollBy = (direction: number) => {
    trackRef.current?.scrollBy({
      left: direction * Math.min(trackRef.current.clientWidth * 0.82, 520),
      behavior: 'smooth',
    });
  };

  return (
    <section className="bg-soft py-14" id="destacados">
      <div className="container-px">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-label">DESTACADOS</p>
            <h2 className="section-title">
              Más <span className="text-accentDeep">vendidos</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Packs, creatinas, óxido nítrico y whey para armar tu próximo stack.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="#sets" className="btn-outline !px-4 !py-2.5 text-xs">
              <Package size={14} /> Ver packs
            </Link>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Ver productos anteriores"
              className="hidden h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent sm:flex"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Ver más productos"
              className="hidden h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent sm:flex"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </Reveal>

        <div
          ref={trackRef}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {featured.map((product) => (
            <div key={product.id} className="w-[270px] shrink-0 snap-start sm:w-[300px]">
              <BestSellerCard product={product} />
            </div>
          ))}
        </div>

        <BestSellerCTA />
      </div>
    </section>
  );
}
