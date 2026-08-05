import { BadgeCheck, MessageCircle, RefreshCcw, Truck } from 'lucide-react';
import { cx } from '@/lib/utils';

const ITEMS = [
  { icon: Truck, title: 'Entrega en metro', text: 'Todas las líneas de Santiago' },
  { icon: RefreshCcw, title: 'Cambios garantizados', text: 'Hasta 30 días' },
  { icon: BadgeCheck, title: 'Productos originales', text: 'Sello de garantía' },
  { icon: MessageCircle, title: 'Confirmación por WhatsApp', text: 'Respuesta rápida' },
];

export default function TrustBadges({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        'grid grid-cols-2 gap-3 rounded-2xl border border-line bg-soft/50 p-4 sm:grid-cols-4',
        className,
      )}
    >
      {ITEMS.map((b) => (
        <div key={b.title} className="flex flex-col items-center gap-1.5 text-center">
          <b.icon size={20} className="text-accentDeep" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink">
            {b.title}
          </span>
          <span className="text-[11px] leading-tight text-muted">{b.text}</span>
        </div>
      ))}
    </div>
  );
}
