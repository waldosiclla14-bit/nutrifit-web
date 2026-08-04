import Link from 'next/link';
import { Zap, Truck } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import FlashSaleCountdown from '@/components/home/FlashSaleCountdown';

export default function PromoStrip() {
  return (
    <section className="container-px py-10">
      <div className="grid gap-5 md:grid-cols-2">
        <Reveal>
          <article className="flex h-full items-center gap-5 rounded-3xl border border-line bg-soft p-6 transition-colors hover:border-accent">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink">
              <Zap size={26} />
            </span>
            <div className="flex-1">
              <h3 className="font-display text-xl uppercase tracking-wide">Flash Sale</h3>
              <p className="mt-1 text-sm text-muted">
                Whey, creatina y más con hasta 16% OFF. Por tiempo limitado.
              </p>
              <div className="mt-3">
                <FlashSaleCountdown />
              </div>
            </div>
            <Link href="/productos" className="shrink-0 text-sm font-bold text-accentDeep">
              Ver ofertas →
            </Link>
          </article>
        </Reveal>
        <Reveal delay={100}>
          <article className="flex items-center gap-5 rounded-3xl border border-line bg-soft p-6 transition-colors hover:border-accent">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-accent">
              <Truck size={26} />
            </span>
            <div className="flex-1">
              <h3 className="font-display text-xl uppercase tracking-wide">Entrega en Metro</h3>
              <p className="mt-1 text-sm text-muted">
                Entregamos en estaciones de las líneas 1, 2, 3, 4, 4A, 5 y 6.
              </p>
            </div>
            <Link href="/#beneficios" className="shrink-0 text-sm font-bold text-accentDeep">
              Ver más →
            </Link>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
