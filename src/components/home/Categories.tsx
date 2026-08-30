import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CATEGORIES } from '@/data/seed';
import Reveal from '@/components/ui/Reveal';

export default function Categories() {
  return (
    <section className="container-px py-14 lg:py-[100px]" id="categorias">
      <Reveal className="mb-10 text-center">
        <p className="section-label">CATEGORÍAS</p>
        <h2 className="section-title">
          Encuentra lo que <span className="text-accentDeep">necesitas</span>
        </h2>
      </Reveal>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {CATEGORIES.map((cat, i) => (
          <Reveal key={cat.key} delay={i * 60}>
            <Link
              href={`/productos?cat=${cat.key}`}
              className="group relative block overflow-hidden rounded-3xl border border-line bg-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent transition-opacity duration-300" />
              <div className="absolute bottom-0 w-full p-4 text-white">
                <h3 className="font-display text-lg uppercase tracking-wide drop-shadow-md">{cat.label}</h3>
                <p className="mt-1 text-xs text-white/70 transition-colors duration-300 group-hover:text-white/90">
                  {cat.blurb}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent transition-all duration-300 group-hover:gap-2">
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
