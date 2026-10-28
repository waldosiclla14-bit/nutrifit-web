import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { BRAND, PRODUCT_BRANDS, PRODUCTS } from '@/data/seed';
import Reveal from '@/components/ui/Reveal';
import { slugify } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Marcas de Suplementos',
  description:
    'Explora las marcas de suplementos que vendemos en NutriFit: proteínas, creatinas, vitaminas y bienestar. Productos originales con garantía.',
  alternates: { canonical: '/marcas' },
  openGraph: {
    title: `Marcas | ${BRAND.name}`,
    description: 'Todas las marcas de suplementos disponibles en NutriFit.',
    url: `${BRAND.url}/marcas`,
    siteName: BRAND.name,
  },
};

export default function BrandsPage() {
  const brands = PRODUCT_BRANDS.map((name) => {
    const items = PRODUCTS.filter((p) => p.brand === name);
    const image = items.find((p) => p.image)?.image ?? '/img/logo-fallback.png';
    return { name, count: items.length, image };
  });

  return (
    <div className="bg-sport-bg text-gray-900">
      <section className="container-px py-14 sm:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-sport-green">
            MARCAS
          </p>
          <h1 className="mt-4 font-display text-4xl uppercase tracking-wide sm:text-5xl">
            Nuestras <span className="text-sport-green">marcas</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-gray-500">
            Trabajamos con marcas de suplementos reconocidas. Todos nuestros productos son
            originales y cuentan con sello de garantía NutriFit.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand, i) => (
            <Reveal key={brand.name} delay={i * 50}>
              <Link
                href={`/productos?marca=${encodeURIComponent(brand.name)}`}
                className="group flex items-center gap-4 rounded-3xl border border-sport-border/50 bg-sport-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sport-green/40"
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sport-surface p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brand.image}
                    alt={brand.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-lg uppercase tracking-wide text-gray-900">
                    {brand.name}
                  </h2>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                    <BadgeCheck size={13} className="text-sport-green" />
                    {brand.count} producto{brand.count === 1 ? '' : 's'}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-sport-green transition-all duration-300 group-hover:gap-2">
                    Ver productos <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
