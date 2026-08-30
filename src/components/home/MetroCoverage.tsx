import { Train } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

export default function MetroCoverage() {
  return (
    <section className="bg-soft py-14 lg:py-[100px]" id="cobertura">
      <div className="container-px">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-accent mx-auto">
              <Train size={28} />
            </span>
            <h2 className="mt-6 font-display text-3xl uppercase tracking-wide lg:text-4xl">
              7 líneas · <span className="text-accentDeep">+140 estaciones</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Entregamos en todas las estaciones del Metro de Santiago. Coordinamos la estación y
              el horario que más te convenga, sin mínimo de compra.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {['L1', 'L2', 'L3', 'L4', 'L4A', 'L5', 'L6'].map((line) => (
                <span
                  key={line}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper text-sm font-bold text-ink ring-1 ring-line"
                >
                  {line.replace('L', '')}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
