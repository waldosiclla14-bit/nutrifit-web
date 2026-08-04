import { BadgeCheck, MessageCircle, ShieldCheck, Sparkles, Truck, Wallet } from 'lucide-react';
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
  {
    icon: Sparkles,
    title: '+500 pedidos',
    text: 'Más de 500 pedidos entregados con una valoración media de 4.9/5.',
  },
];

export default function Benefits() {
  return (
    <section className="bg-dark py-14 text-white" id="beneficios">
      <div className="container-px">
        <Reveal className="mb-10 text-center">
          <p className="section-label text-accent">BENEFICIOS</p>
          <h2 className="section-title-dark">
            Compra con <span className="text-accent">confianza</span>
          </h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={i * 60}>
              <article className="flex h-full gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-colors hover:border-accent/50">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink">
                  <item.icon size={22} />
                </span>
                <div>
                  <h3 className="font-display text-lg uppercase tracking-wide">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/70">{item.text}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
