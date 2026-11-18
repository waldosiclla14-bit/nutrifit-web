import Reveal from '@/components/ui/Reveal';

const STEPS = [
  {
    title: 'Elige tus productos',
    text: 'Explora el catálogo y agrega al carrito lo que necesites. Usa los filtros por marca, precio y objetivo.',
  },
  {
    title: 'Completa tus datos',
    text: 'Indica nombre y teléfono, elige tu línea y estación de metro, y el método de pago que prefieras.',
  },
  {
    title: 'Finaliza por WhatsApp',
    text: 'Te enviamos tu pedido resumido para confirmar. Respondemos al tiro y coordinamos tu entrega.',
  },
];

export default function HowTo() {
  return (
    <section className="container-px bg-sport-bg py-14 lg:py-[100px]" id="como-comprar">
      <Reveal className="mb-10 text-center">
        <h2 className="mt-2 font-display text-[28px] uppercase leading-tight tracking-wide text-gray-900 lg:text-[36px]">
          Compra en <span className="text-sport-greenText">3 pasos</span>
        </h2>
      </Reveal>
      <div className="grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 100}>
            <article className="relative h-full rounded-3xl border border-sport-border/50 bg-sport-card p-6 pt-9">
              <span
                aria-hidden="true"
                className="absolute -top-5 left-6 font-display text-5xl uppercase tracking-wide text-sport-greenText"
              >
                0{i + 1}
              </span>
              <h3 className="mt-4 font-display text-xl uppercase tracking-wide text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{step.text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
