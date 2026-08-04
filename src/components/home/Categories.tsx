import Image from 'next/image';
import Link from 'next/link';
import { CATEGORIES } from '@/data/seed';
import Reveal from '@/components/ui/Reveal';

export default function Categories() {
  return (
    <section className="container-px py-14" id="categorias">
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
              className="group relative block overflow-hidden rounded-3xl border border-line bg-soft"
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute bottom-0 w-full p-4 text-white">
                <h3 className="font-display text-lg uppercase tracking-wide">{cat.label}</h3>
                <p className="text-xs text-white/0 transition-colors duration-300 group-hover:text-white/85">
                  {cat.blurb}
                </p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
