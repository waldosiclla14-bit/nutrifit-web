import { Check, X } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

const ROWS = [
  { feature: 'Entrega en Metro (misma semana)', nutrifit: true, otros: false },
  { feature: 'Sin costo de envío en Metro', nutrifit: true, otros: false },
  { feature: 'Pago al recibir (efectivo)', nutrifit: true, otros: false },
  { feature: 'Asesoría personalizada por WhatsApp', nutrifit: true, otros: false },
  { feature: 'Productos 100% originales con sello', nutrifit: true, otros: true },
  { feature: 'Garantía de 30 días', nutrifit: true, otros: false },
];

export default function WhyNutriFit() {
  return (
    <section className="container-px py-14 lg:py-[100px]" id="por-que-nutrifit">
      <Reveal className="mb-10 text-center">
        <p className="section-label">LA DIFERENCIA</p>
        <h2 className="section-title">
          ¿Por qué <span className="text-accentDeep">NutriFit</span>?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
          No somos un marketplace genérico. Somos una tienda especializada con entrega directa en metro.
        </p>
      </Reveal>

      <Reveal>
        <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-line">
          {/* Header */}
          <div className="grid grid-cols-3 bg-soft text-sm font-bold">
            <div className="px-5 py-4 text-muted">Característica</div>
            <div className="px-5 py-4 text-center text-accentDeep">NutriFit</div>
            <div className="px-5 py-4 text-center text-muted">Tiendas tradicionales</div>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-3 text-sm ${i < ROWS.length - 1 ? 'border-b border-line' : ''}`}
            >
              <div className="flex items-center gap-3 px-5 py-4 font-medium text-ink">
                {row.feature}
              </div>
              <div className="flex items-center justify-center px-5 py-4">
                {row.nutrifit ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-ink">
                    <Check size={14} strokeWidth={3} />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-500">
                    <X size={14} strokeWidth={3} />
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center px-5 py-4">
                {row.otros ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-soft text-muted">
                    <Check size={14} strokeWidth={3} />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-500">
                    <X size={14} strokeWidth={3} />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
