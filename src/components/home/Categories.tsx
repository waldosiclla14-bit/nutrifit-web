import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CATEGORIES } from '@/data/seed';
import Reveal from '@/components/ui/Reveal';

export default function Categories() {
  return (
    <section className="container-px bg-sport-surface py-14 lg:py-[100px]" id="categorias">
      <Reveal className="mb-10 text-center">
        <h2 className="mt-2 font-display text-[28px] uppercase leading-tight tracking-wide text-gray-900 lg:text-[36px]">
          Encuentra lo que <span className="text-sport-greenText">necesitas</span>
        </h2>
      </Reveal>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {CATEGORIES.map((cat, i) => (
          <Reveal key={cat.key} delay={i * 60} className="h-full">
            <Link
              href={`/productos/categoria/${cat.key}`}
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-sport-border/60 bg-sport-card transition-all duration-300 hover:-translate-y-1 hover:border-sport-green/40 hover:shadow-soft"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-sport-surface">
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col border-t border-sport-border/60 p-4">
                <h3 className="font-display text-lg uppercase leading-tight tracking-wide text-gray-900">
                  {cat.label}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">{cat.blurb}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-bold text-sport-greenText transition-all duration-300 group-hover:gap-2">
                  Ver productos <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
