import { BadgeCheck, MessageCircle, ShieldCheck, Truck, Wallet } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

const ITEMS = [
  {
    icon: BadgeCheck,
    title: 'Productos Originales',
    text: 'Garantizamos la autenticidad de cada suplemento. 100% originales.',
  },
  {
    icon: Truck,
    title: 'Entrega en Metro',
    text: 'Te esperamos en tu estación de las líneas 1, 2, 3, 4, 4A, 5 y 6.',
  },
  {
    icon: MessageCircle,
    title: 'Atención Personalizada',
    text: 'Asesoría experta vía WhatsApp, respondemos al tiro.',
  },
  {
    icon: ShieldCheck,
    title: 'Garantía de 30 días',
    text: 'Garantía de satisfacción en productos sin abrir con sello intacto.',
  },
  {
    icon: Wallet,
    title: 'Pago simple',
    text: 'Transferencia o efectivo en el punto de entrega. Tú eliges.',
  },
];

export default function Benefits() {
  return (
    <section className="bg-sport-bg py-14 text-white lg:py-[100px]" id="beneficios">
      <div className="container-px">
        <Reveal className="mb-10 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-sport-green">BENEFICIOS</p>
          <h2 className="mt-2 font-display text-[28px] uppercase leading-tight tracking-wide text-white lg:text-[36px]">
            Compra con <span className="text-sport-green">confianza</span>
          </h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={i * 60}>
              <article className="flex h-full gap-4 rounded-3xl border border-sport-border/50 bg-sport-card p-6 transition-colors hover:border-sport-green/40">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sport-green text-white">
                  <item.icon size={22} />
                </span>
                <div>
                  <h3 className="font-display text-lg uppercase tracking-wide text-white">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/50">{item.text}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
