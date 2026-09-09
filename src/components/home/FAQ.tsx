import Reveal from '@/components/ui/Reveal';

const FAQS = [
  {
    q: '¿Cómo hago mi pedido?',
    a: 'Agrega los productos al carrito, completa tus datos de entrega y pago, y presiona "Finalizar compra por WhatsApp". Recibirás un resumen para confirmar y listo.',
  },
  {
    q: '¿Dónde me entregas mi pedido?',
    a: 'Hacemos entregas en estaciones de metro de las líneas 1, 2, 3, 4, 4A, 5 y 6, en todas las estaciones. Coordinamos contigo el punto, el día y la hora por WhatsApp.',
  },
  {
    q: '¿Cuáles son los métodos de pago?',
    a: 'Aceptamos transferencia bancaria o pago en efectivo en el punto de entrega. Lo coordinamos directamente por WhatsApp.',
  },
  {
    q: '¿Hacen despachos a domicilio?',
    a: 'Por el momento no hacemos despacho a domicilio. Las entregas son en estaciones de metro de todas las líneas.',
  },
  {
    q: '¿Los productos son originales?',
    a: '100% originales. Trabajamos con distribuidores oficiales y todos los productos tienen sello de garantía y fecha de vencimiento visible.',
  },
  {
    q: '¿Cuánto demora la entrega?',
    a: 'Coordinamos la entrega en la estación que elijas, normalmente dentro de las 24 a 48 horas desde la confirmación del pedido por WhatsApp.',
  },
];

export default function FAQ() {
  return (
    <section className="bg-sport-bg py-14 lg:py-[100px]" id="faq">
      <div className="container-px">
        <Reveal className="mb-10 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-sport-green">PREGUNTAS FRECUENTES</p>
          <h2 className="mt-2 font-display text-[28px] uppercase leading-tight tracking-wide text-gray-900 lg:text-[36px]">
            Resolvemos tus <span className="text-sport-green">dudas</span>
          </h2>
        </Reveal>
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQS.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 50}>
              <details className="group rounded-2xl border border-sport-border/50 bg-sport-card p-5 open:shadow-sportCard">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-gray-900 sm:text-base [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sport-bg text-gray-500 transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{faq.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
