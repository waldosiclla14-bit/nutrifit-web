import Link from 'next/link';
import { MessageCircle, Clock, Train } from 'lucide-react';
import { BRAND } from '@/data/seed';

/**
 * Barra informativa superior (no fija). Muestra entrega en Metro, horario de
 * atención y contacto por WhatsApp. No anuncia envío gratis (política vigente).
 */
export default function TopBar() {
  return (
    <div className="bg-sport-green text-white">
      <div className="container-px flex h-9 items-center justify-between gap-4 text-[12px] font-semibold">
        <p className="hidden items-center gap-1.5 sm:flex">
          <Train size={14} className="shrink-0" />
          Entrega coordinada en estaciones de Metro de Santiago
        </p>
        <p className="flex items-center gap-1.5 sm:hidden">
          <Train size={14} className="shrink-0" />
          Entrega en Metro de Santiago
        </p>
        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-1.5 md:flex">
            <Clock size={14} className="shrink-0" />
            {BRAND.hours}
          </span>
          <Link
            href={`https://wa.me/${BRAND.whatsappDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 underline-offset-4 hover:underline"
          >
            <MessageCircle size={14} className="shrink-0" />
            WhatsApp {BRAND.whatsapp}
          </Link>
        </div>
      </div>
    </div>
  );
}
