import Image from 'next/image';
import { BadgeCheck, Quote } from 'lucide-react';
import { TESTIMONIALS } from '@/data/seed';
import Reveal from '@/components/ui/Reveal';
import Stars from '@/components/ui/Stars';

export default function Testimonials() {
  return (
    <section className="container-px py-14" id="opiniones">
      <Reveal className="mb-10 text-center">
        <p className="section-label">OPINIONES</p>
        <h2 className="section-title">
          Nuestros <span className="text-accentDeep">clientes</span>
        </h2>
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={i * 60}>
            <article className="relative flex h-full flex-col rounded-3xl border border-line bg-paper p-6">
              <Quote size={26} className="text-soft2" />
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/80">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <div className="relative">
                  {t.avatar ? (
                    <span className="block h-11 w-11 overflow-hidden rounded-full bg-soft">
                      <Image
                        src={t.avatar}
                        alt={t.name}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    </span>
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink font-display text-sm uppercase text-accent">
                      {t.name
                        .split(' ')
                        .map((w) => w[0])
                        .join('')}
                    </span>
                  )}
                  {t.verified && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-ink ring-2 ring-paper">
                      <BadgeCheck size={12} />
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-xs text-muted">{t.role}</p>
                </div>
                <div className="ml-auto">
                  <Stars rating={t.rating} size={13} />
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
