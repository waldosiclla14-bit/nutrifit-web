import Link from 'next/link';
import Image from 'next/image';
import { Truck } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import Counter from '@/components/ui/Counter';
import { BRAND } from '@/data/seed';

function Stat({
  value,
  suffix,
  label,
  decimal = false,
}: {
  value: number;
  suffix?: string;
  label: string;
  decimal?: boolean;
}) {
  return (
    <div>
      <p className="font-display text-3xl tracking-wide text-accent">
        <Counter end={value} suffix={suffix} decimal={decimal} />
      </p>
      <p className="mt-1 text-xs text-white/60">{label}</p>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-dark text-white">
      <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-lime-500/10 blur-[110px]" />
      <div className="hero-grid absolute inset-0 opacity-60" />

      <div className="container-px relative grid min-h-[70vh] items-center gap-12 py-16 lg:grid-cols-2 lg:py-20">
        <div>
          <Reveal>
            <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-accent">
              Suplementos deportivos · Chile
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-4 font-display text-6xl uppercase leading-[0.9] tracking-wide sm:text-7xl lg:text-8xl">
              Nutri<span className="text-accent">Fit</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-3 text-base font-bold uppercase tracking-[0.25em] text-white/85 sm:text-lg">
              {BRAND.tagline}
            </p>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
              Potencia tu rendimiento con suplementos deportivos y vitaminas de alta calidad.
              Productos originales, entrega en metro en todas las líneas.
            </p>
          </Reveal>
          <Reveal delay={280}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/productos" className="btn-accent">
                Comprar Ahora
              </Link>
              <Link href="/#destacados" className="btn-outline-dark">
                Ver Destacados
              </Link>
            </div>
          </Reveal>
          <Reveal delay={340}>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              <Stat value={500} suffix="+" label="Pedidos entregados" />
              <Stat value={100} suffix="%" label="Productos originales" />
              <Stat value={4.9} suffix="/5" decimal label="Valoración media" />
            </div>
          </Reveal>
        </div>

        <Reveal delay={200} className="hidden lg:block">
          <div className="relative mx-auto max-w-md">
            <div className="absolute inset-0 -z-10 rounded-full bg-accent/20 blur-[90px]" />
            <div className="animate-floaty">
              <div className="relative rounded-[2.5rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
                <Image
                  src="/img/producto1.webp"
                  alt="FullEnergic 100% Whey Protein Vainilla 1kg"
                  width={420}
                  height={420}
                  priority
                  className="mx-auto w-full object-contain"
                />
              </div>
              <span className="absolute -left-3 top-10 rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold text-ink shadow-glow">
                -11% OFF
              </span>
              <span className="absolute -bottom-3 right-4 flex items-center gap-1.5 rounded-full bg-dark px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/25">
                <Truck size={13} className="text-accent" /> Entrega en Metro
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
