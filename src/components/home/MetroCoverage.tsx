import { Train } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

export default function MetroCoverage() {
  return (
    <section className="bg-sport-surface py-14 lg:py-[100px]" id="cobertura">
      <div className="container-px">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sport-bg text-sport-green mx-auto">
              <Train size={28} />
            </span>
            <h2 className="mt-6 font-display text-3xl uppercase tracking-wide text-white lg:text-4xl">
              7 líneas · <span className="text-sport-green">+140 estaciones</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/50">
              Entregamos en todas las estaciones del Metro de Santiago. Coordinamos la estación y
              el horario que más te convenga, sin mínimo de compra.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {['L1', 'L2', 'L3', 'L4', 'L4A', 'L5', 'L6'].map((line) => (
                <span
                  key={line}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-sport-card text-sm font-bold text-white ring-1 ring-sport-border/50"
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
