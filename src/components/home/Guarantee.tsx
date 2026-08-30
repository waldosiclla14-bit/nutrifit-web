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
    <section className="bg-dark py-14 text-white lg:py-[100px]">
      <div className="container-px">
        <Reveal className="mb-10 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-accent">GARANTÍA</p>
          <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-tight lg:text-[36px]">
            Compra con <span className="text-accent">confianza total</span>
          </h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={i * 80}>
              <article className="flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <item.icon size={24} />
                </span>
                <h3 className="mt-4 font-display text-lg uppercase tracking-wide">{item.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/65">{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
