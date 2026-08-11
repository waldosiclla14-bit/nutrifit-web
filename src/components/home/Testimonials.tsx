import Image from 'next/image';
import { ArrowUpRight, Quote } from 'lucide-react';
import { BRAND, TESTIMONIALS } from '@/data/seed';
import Reveal from '@/components/ui/Reveal';
import Stars from '@/components/ui/Stars';

export default function Testimonials() {
  return (
    <section className="bg-dark py-16 text-white sm:py-20" id="opiniones">
      <div className="container-px">
        <Reveal className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-accent">OPINIONES</p>
            <h2 className="mt-2 font-display text-3xl uppercase leading-tight tracking-wide sm:text-4xl lg:text-5xl">
              Resultados que <span className="text-accent">se comparten</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
              Atención rápida, productos originales y entregas coordinadas en tu estación de Metro.
            </p>
          </div>
          <a
            href="https://g.page/r/Cfn1bn119aM7EAE/review"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline-dark w-fit !border-white/20 !px-4 !py-2.5 text-xs"
          >
            Compartir mi experiencia <ArrowUpRight size={14} />
          </a>
        </Reveal>

        <Reveal className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-3xl tracking-wide text-accent">4.9</span>
            <div>
              <Stars rating={4.9} size={15} />
              <p className="mt-1 text-[11px] text-white/50">Valoración media</p>
            </div>
          </div>
          <span className="hidden h-8 w-px bg-white/15 sm:block" />
          <p className="text-sm text-white/65">Más de {BRAND.orders} pedidos coordinados en Santiago.</p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 60}>
              <article className="relative flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.06] p-6 transition-colors hover:border-accent/50">
                <Quote size={26} className="text-accent/50" aria-hidden="true" />
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/80">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                  {t.avatar ? (
                    <span className="block h-11 w-11 overflow-hidden rounded-full bg-soft">
                      <Image src={t.avatar} alt="" width={44} height={44} className="h-full w-full object-cover" />
                    </span>
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-display text-sm uppercase text-ink">
                      {t.name.split(' ').map((w) => w[0]).join('')}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-white/50">{t.role}</p>
                  </div>
                  <div className="ml-auto"><Stars rating={t.rating} size={13} /></div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
