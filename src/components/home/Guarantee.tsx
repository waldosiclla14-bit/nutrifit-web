import { RefreshCcw, ShieldCheck, Truck } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

const ITEMS = [
  {
    icon: ShieldCheck,
    title: '100% originales',
    text: 'Cada producto tiene sello de garantía y trazabilidad intacta. Trabajamos directo con distribuidores oficiales.',
  },
  {
    icon: RefreshCcw,
    title: 'Garantía 30 días',
    text: 'Si algo no te convence, te devolvemos tu dinero. Sin preguntas, sin drama. Solo productos sin abrir.',
  },
  {
    icon: Truck,
    title: 'Entrega coordinada',
    text: 'Te esperamos en tu estación de metro. Coordinamos día y hora por WhatsApp. Sin sorpresas.',
  },
];

export default function Guarantee() {
  return (
    <section className="bg-sport-bg py-14 text-white lg:py-[100px]">
      <div className="container-px">
        <Reveal className="mb-10 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-sport-green">GARANTÍA</p>
          <h2 className="mt-2 font-display text-[28px] uppercase leading-tight tracking-wide text-white lg:text-[36px]">
            Compra con <span className="text-sport-green">confianza total</span>
          </h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={i * 80}>
              <article className="flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sport-green/15 text-sport-green">
                  <item.icon size={24} />
                </span>
                <h3 className="mt-4 font-display text-lg uppercase tracking-wide text-white">{item.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/50">{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
