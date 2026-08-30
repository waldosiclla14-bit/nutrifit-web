import { BadgeCheck, Rocket, Train, Truck } from 'lucide-react';

const PROMISES = [
  { icon: Truck, title: 'Entrega 24–48 hrs', text: 'Coordinada por WhatsApp' },
  { icon: Train, title: 'Todas las líneas de Metro', text: '+140 estaciones en Santiago' },
  { icon: Rocket, title: 'Envío gratis', text: 'En Metro por compras sobre $30.000' },
  { icon: BadgeCheck, title: '100% originales', text: 'Sello de garantía NutriFit' },
];

function Item({ icon: Icon, title, text }: { icon: React.ComponentType<{ size?: number }>; title: string; text: string }) {
  return (
    <div className="flex w-[260px] shrink-0 items-center gap-3 px-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accentDeep">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase leading-tight tracking-wide text-ink">
          {title}
        </p>
        <p className="truncate text-xs text-muted">{text}</p>
      </div>
    </div>
  );
}

export default function TrustStrip() {
  const items = PROMISES.map((p) => (
    <Item key={p.title} icon={p.icon} title={p.title} text={p.text} />
  ));

  return (
    <div className="border-b border-line bg-soft">
      {/* Mobile: carrusel auto-scroll */}
      <div className="lg:hidden overflow-hidden py-5">
        <div
          className="flex gap-4 w-max"
          style={{ animation: 'marquee 18s linear infinite' }}
        >
          {items}
          {items}
        </div>
      </div>

      {/* Desktop: grid estático */}
      <div className="container-px hidden lg:grid grid-cols-4 gap-x-6 py-5">
        {PROMISES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accentDeep">
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase leading-tight tracking-wide text-ink">
                {title}
              </p>
              <p className="truncate text-xs text-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
