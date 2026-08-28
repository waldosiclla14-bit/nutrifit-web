import { MessageCircle, PenLine, ShoppingBag } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

const STEPS = [
  {
    icon: ShoppingBag,
    title: 'Elige tus productos',
    text: 'Explora el catálogo y agrega al carrito lo que necesites. Usa los filtros por marca, precio y objetivo.',
  },
  {
    icon: PenLine,
    title: 'Completa tus datos',
    text: 'Indica nombre y teléfono, elige tu línea y estación de metro, y el método de pago que prefieras.',
  },
  {
    icon: MessageCircle,
    title: 'Finaliza por WhatsApp',
    text: 'Te enviamos tu pedido resumido para confirmar. Respondemos al tiro y coordinamos tu entrega.',
  },
];

export default function HowTo() {
  return (
    <section className="container-px py-14 lg:py-[100px]" id="como-comprar">
      <Reveal className="mb-10 text-center">
        <p className="section-label">CÓMO COMPRAR</p>
        <h2 className="section-title">
          Compra en <span className="text-accentDeep">3 pasos</span>
        </h2>
      </Reveal>
      <div className="grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 100}>
            <article className="relative h-full rounded-3xl border border-line bg-soft p-6 pt-8">
              <span className="absolute -top-4 left-6 font-display text-5xl uppercase tracking-wide text-accent">
                0{i + 1}
              </span>
              <span className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-accent">
                <step.icon size={22} />
              </span>
              <h3 className="mt-4 font-display text-xl uppercase tracking-wide">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
