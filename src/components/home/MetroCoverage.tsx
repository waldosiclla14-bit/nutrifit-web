import { Train } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

const LINES = [
  { id: 'L1', label: 'Línea 1', color: 'bg-red-500', stations: 27 },
  { id: 'L2', label: 'Línea 2', color: 'bg-yellow-500', stations: 22 },
  { id: 'L3', label: 'Línea 3', color: 'bg-amber-700', stations: 18 },
  { id: 'L4', label: 'Línea 4', color: 'bg-blue-600', stations: 23 },
  { id: 'L4A', label: 'Línea 4A', color: 'bg-sky-500', stations: 6 },
  { id: 'L5', label: 'Línea 5', color: 'bg-green-600', stations: 30 },
  { id: 'L6', label: 'Línea 6', color: 'bg-purple-600', stations: 15 },
];

const MAX = 30;

export default function MetroCoverage() {
  return (
    <section className="bg-soft py-14 lg:py-[100px]" id="cobertura">
      <div className="container-px">
        <Reveal className="mb-10 text-center">
          <p className="section-label">COBERTURA</p>
          <h2 className="section-title">
            Tu <span className="text-accentDeep">metro</span>, tu horario
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
            Entregamos en estaciones de todas las líneas del Metro de Santiago.
            Coordinamos la estación y el horario que más te convenga, sin mínimo de compra.
          </p>
        </Reveal>

        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="space-y-3.5">
              {LINES.map((line) => (
                <div key={line.id} className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${line.color} text-xs font-extrabold text-white`}
                  >
                    {line.id.replace('L', '')}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{line.label}</span>
                      <span className="text-muted">{line.stations} estaciones</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-soft2">
                      <div
                        className={`h-full rounded-full ${line.color}`}
                        style={{ width: `${Math.round((line.stations / MAX) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border border-line bg-paper p-8 text-center">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-[80px]" />
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-ink text-accent">
                <Train size={36} />
              </span>
              <p className="mt-5 font-display text-3xl uppercase tracking-wide">
                7 líneas · <span className="text-accentDeep">+140 estaciones</span>
              </p>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
                ¿No estás en Santiago? Pregúntanos por WhatsApp y buscamos la mejor opción
                de entrega para ti.
              </p>
              <a
                href="https://wa.me/56923883826?text=Hola%20NUTRIFIT%2C%20%C2%BFentregas%20fuera%20de%20Santiago%3F"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline mt-6"
              >
                Consultar cobertura
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
