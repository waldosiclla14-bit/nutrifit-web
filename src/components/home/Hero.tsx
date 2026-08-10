import Link from 'next/link';
import Image from 'next/image';
import { Truck } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import Counter from '@/components/ui/Counter';

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
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-accent sm:tracking-[0.3em]">
              Pack más vendido · elige tu sabor
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-4 max-w-3xl font-display text-5xl uppercase leading-[0.9] tracking-wide sm:text-7xl lg:text-8xl">
              Whey +<br />
              <span className="text-accent">creatina.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 text-base font-bold uppercase tracking-[0.14em] text-white/85 sm:text-lg sm:tracking-[0.2em]">
              Tu stack empieza aquí
            </p>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
              FullEnergic Whey Protein 1kg + Creatina Eco Naturales 300g. Elige entre 5 sabores y
              entrena con productos originales.
            </p>
          </Reveal>
          <Reveal delay={250}>
            <div className="mt-6 inline-flex max-w-full flex-col rounded-2xl border border-accent/35 bg-white/10 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:gap-5">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-accent">
                  Pack proteína + creatina
                </p>
                <p className="mt-1 text-xs text-white/65">5 sabores · entrega en Metro</p>
              </div>
              <div className="mt-2 flex items-baseline gap-2 sm:mt-0">
                <span className="text-xs text-white/50 line-through">$30.000</span>
                <strong className="font-display text-2xl tracking-wide text-white">$27.500</strong>
              </div>
            </div>
          </Reveal>
          <Reveal delay={280}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/productos" className="btn-accent">
                Comprar ahora
              </Link>
              <Link href="/#sets" className="btn-outline-dark">
                Ver el pack
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

        <Reveal delay={200} className="block">
          <div className="relative mx-auto max-w-xs sm:max-w-md">
            <div className="absolute inset-0 -z-10 rounded-full bg-accent/20 blur-[90px]" />
            <div className="animate-floaty">
              <div className="relative rounded-[2.5rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
                <Image
                  src="/img/proteina whey full energic + creatina eco naturales 300g.png"
                  alt="Pack FullEnergic Whey Protein y Creatina Eco Naturales"
                  width={720}
                  height={720}
                  priority
                  className="mx-auto w-full object-contain"
                />
              </div>
              <span className="absolute -left-3 top-8 rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold text-ink shadow-glow sm:top-10">
                -8% OFF
              </span>
              <span className="absolute -right-3 bottom-10 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-ink shadow-soft sm:bottom-12">
                5 sabores
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
