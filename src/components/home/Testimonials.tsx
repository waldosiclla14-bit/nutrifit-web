import Image from 'next/image';
import { ArrowUpRight, Quote, Camera } from 'lucide-react';
import { BRAND, TESTIMONIALS } from '@/data/seed';
import Reveal from '@/components/ui/Reveal';
import Stars from '@/components/ui/Stars';

function Avatar({ name, avatar }: { name: string; avatar?: string }) {
  return avatar ? (
    <span className="block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-soft">
      <Image src={avatar} alt="" width={44} height={44} className="h-full w-full object-cover" />
    </span>
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent font-bold uppercase text-ink">
      {name
        .split(' ')
        .map((w) => w[0])
        .join('')}
    </span>
  );
}

export default function Testimonials() {
  const featured = TESTIMONIALS.find((t) => t.name === 'Matías Rojas') ?? TESTIMONIALS[0];
  const others = TESTIMONIALS.filter((t) => t.name !== featured.name).slice(0, 2);

  return (
    <section className="bg-dark py-14 text-white lg:py-[100px]" id="opiniones">
      <div className="container-px">
        <Reveal className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-accent">
              OPINIONES
            </p>
            <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-tight lg:text-[36px]">
              Resultados que <span className="text-accent">se comparten</span>
            </h2>
            <p className="mt-3 flex items-center gap-2 text-sm text-white/65 sm:text-base">
              <Camera size={16} className="text-accent" aria-hidden="true" />
              Foto del producto antes de coordinar
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

        <Reveal className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-3xl tracking-wide text-accent">4.9</span>
            <div>
              <Stars rating={4.9} size={15} />
              <p className="mt-1 text-[11px] text-white/50">Valoración media</p>
            </div>
          </div>
          <span className="hidden h-8 w-px bg-white/15 sm:block" />
          <p className="text-sm text-white/65 sm:text-base">
            Más de {BRAND.orders} pedidos coordinados en Santiago.
          </p>
        </Reveal>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Testimonio destacado */}
          <Reveal className="h-full">
            <article className="flex h-full flex-col rounded-3xl border border-accent/40 bg-white/[0.07] p-7 sm:p-8">
              <Quote size={52} className="text-accent/40" aria-hidden="true" />
              <p className="mt-4 flex-1 text-lg leading-relaxed text-white/90">
                &ldquo;{featured.text}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                <Avatar name={featured.name} avatar={featured.avatar} />
                <div>
                  <p className="text-base font-bold">{featured.name}</p>
                  <p className="text-sm text-white/50">Voy al gym 4x semana</p>
                </div>
                <div className="ml-auto">
                  <Stars rating={featured.rating} size={16} />
                </div>
              </div>
            </article>
          </Reveal>

          {/* Los 2 restantes en grid de 2 columnas */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {others.map((t) => (
              <Reveal key={t.name}>
                <article className="relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-6 transition-colors hover:border-accent/50">
                  <Quote size={22} className="text-accent/50" aria-hidden="true" />
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-white/80">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                    <Avatar name={t.name} avatar={t.avatar} />
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      <p className="text-xs text-white/50">{t.role}</p>
                    </div>
                    <div className="ml-auto">
                      <Stars rating={t.rating} size={13} />
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
