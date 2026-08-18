import { BadgeCheck, Rocket, Train, Truck } from 'lucide-react';

const PROMISES = [
  { icon: Truck, title: 'Entrega 24–48 hrs', text: 'Coordinada por WhatsApp' },
  { icon: Train, title: 'Todas las líneas de Metro', text: '+140 estaciones en Santiago' },
  { icon: Rocket, title: 'Envío gratis', text: 'En Metro por compras sobre $30.000' },
  { icon: BadgeCheck, title: '100% originales', text: 'Sello de garantía NutriFit' },
];

export default function TrustStrip() {
  return (
    <div className="border-b border-line bg-soft">
      <div className="container-px grid grid-cols-1 gap-x-6 gap-y-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
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
