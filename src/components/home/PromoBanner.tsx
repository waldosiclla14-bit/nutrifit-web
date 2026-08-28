'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BANNERS } from '@/data/seed';
import { cx } from '@/lib/utils';
import Reveal from '@/components/ui/Reveal';

export default function PromoBanner() {
  const banners = BANNERS.filter((b) => b.active);
  if (banners.length === 0) return null;

  return (
    <section className="bg-paper py-14 lg:py-[100px]">
      <div className="container-px">
        <div className={cx('grid gap-6', banners.length > 1 && 'lg:grid-cols-2')}>
          {banners.map((banner, i) => (
            <Reveal key={banner.id} delay={i * 90}>
              <div className="group relative overflow-hidden rounded-3xl shadow-soft">
                <div className="absolute inset-0">
                  <Image
                    src={banner.image}
                    alt={banner.title}
                    fill
                    sizes="(min-width:1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-ink/55" />
                </div>
                <div className="relative flex min-h-[280px] flex-col justify-end p-8 sm:p-10">
                  <h2 className="max-w-md font-display text-3xl uppercase leading-tight tracking-wide text-paper sm:text-4xl">
                    {banner.title}
                  </h2>
                  {banner.subtitle && (
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-paper/80">
                      {banner.subtitle}
                    </p>
                  )}
                  {banner.link && (
                    <Link href={banner.link} className="btn-accent mt-6 w-fit">
                      {banner.cta ?? 'Ver catálogo'}
                      <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
