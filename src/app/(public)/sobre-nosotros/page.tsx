import type { Metadata } from 'next';
import { BRAND } from '@/data/seed';
import {
  ShieldCheck,
  Truck,
  MessageCircle,
  BadgeCheck,
  Heart,
  Zap,
  MapPin,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: `Sobre nosotros | ${BRAND.name}`,
  description: `Conoce a ${BRAND.name}: suplementos deportivos originales con entrega en Metro de Santiago. Envío mismo día, atención por WhatsApp.`,
  openGraph: {
    title: `Sobre nosotros | ${BRAND.name}`,
    description: `Suplementos originales con entrega en Metro de Santiago.`,
    url: `${BRAND.url}/sobre-nosotros`,
    siteName: BRAND.name,
  },
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Originales garantizados',
    text: 'Cada producto llega con sello de garantía y código de verificación. No vendemos imitaciones.',
  },
  {
    icon: Truck,
    title: 'Entrega en Metro',
    text: 'Coordinamos la entrega en tu estación de Metro de Santiago. Mismo día, sin envíos caros.',
  },
  {
    icon: MessageCircle,
    title: 'Atención directa',
    text: 'Respondemos por WhatsApp en minutos, no en días. Asesoría personalizada de expertos.',
  },
  {
    icon: Heart,
    title: 'Garantía 30 días',
    text: 'Si no estás satisfecho, te devolvemos tu dinero. Así de simple.',
  },
];

const TIMELINE = [
  { year: '2024', event: 'Nace NutriFit con un objetivo claro: suplementos originales accesibles en Santiago.' },
  { year: '2024', event: 'Implementamos la entrega en Metro de Santiago para eliminar costos de envío altos.' },
  { year: '2025', event: 'Expandimos a las 7 líneas de Metro con más de 140 estaciones cubiertas.' },
  { year: '2026', event: '+500 pedidos entregados. Sigue creciendo nuestra comunidad de deportistas.' },
];

export default function SobreNosotrosPage() {
  return (
    <>
      {/* Hero */}
      <section className="container-px py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-label">Nuestra historia</p>
          <h1 className="section-title mt-4">
            Suplementos originales,{' '}
            <span className="text-accentDeep">entregados en tu Metro</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            NutriFit nació para resolver un problema simple: en Chile, comprar suplementos
            originales era caro, lento y lleno de dudas. Creamos una forma mejor.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="border-y border-line bg-soft py-16">
        <div className="container-px">
          <div className="mx-auto max-w-2xl text-center">
            <Zap size={32} className="mx-auto text-accentDeep" />
            <h2 className="mt-4 font-display text-3xl uppercase tracking-wide">
              Nuestra misión
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Que cada deportista en Chile tenga acceso a suplementos <strong className="text-ink">100% originales</strong> a
              precios justos, con la comodidad de recibirlos en su estación de Metro el mismo día.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container-px py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-display text-3xl uppercase tracking-wide">
            En qué <span className="text-accentDeep">creemos</span>
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {VALUES.map((v) => (
              <article
                key={v.title}
                className="flex gap-4 rounded-3xl border border-line bg-soft p-6"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
                  <v.icon size={22} />
                </span>
                <div>
                  <h3 className="font-display text-lg uppercase tracking-wide">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{v.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="border-y border-line bg-soft py-16 sm:py-20">
        <div className="container-px">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center font-display text-3xl uppercase tracking-wide">
              Nuestro <span className="text-accentDeep">camino</span>
            </h2>
            <div className="mt-10 space-y-8">
              {TIMELINE.map((t, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-xs font-extrabold text-accentDeep">
                      {t.year}
                    </span>
                    {i < TIMELINE.length - 1 && (
                      <div className="mt-2 h-full w-px bg-line" />
                    )}
                  </div>
                  <p className="pt-2 text-sm leading-relaxed text-muted">{t.event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="container-px py-16 sm:py-20">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { value: '+500', label: 'Pedidos entregados' },
            { value: '140+', label: 'Estaciones de Metro' },
            { value: '4.9★', label: 'Calificación Google' },
            { value: '24–48h', label: 'Tiempo de entrega' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl uppercase tracking-wide text-accentDeep sm:text-4xl">
                {s.value}
              </p>
              <p className="mt-1 text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line bg-soft py-16 text-center">
        <div className="container-px">
          <Users size={32} className="mx-auto text-accentDeep" />
          <h2 className="mt-4 font-display text-3xl uppercase tracking-wide">
            Únete a la comunidad
          </h2>
          <p className="mt-3 text-sm text-muted">
            +500 deportistas ya compran en NutriFit. Prueba la diferencia.
          </p>
          <a
            href="/"
            className="btn-primary mt-6"
          >
            <MapPin size={16} /> Ver catálogo
          </a>
        </div>
      </section>
    </>
  );
}
