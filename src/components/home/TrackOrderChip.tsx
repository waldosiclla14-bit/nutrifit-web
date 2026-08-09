'use client';

import { PackageSearch } from 'lucide-react';
import { openWhatsApp } from '@/lib/whatsapp';
import { getSettings } from '@/lib/store';

export default function TrackOrderChip() {
  const handleTrack = () => {
    const message = [
      'HOLA NUTRIFIT',
      'SEGUIMIENTO DE PEDIDO',
      '─'.repeat(24),
      '',
      'Hola, ¿cómo va mi pedido? Mi código es: [INDICA TU CÓDIGO]',
    ].join('\n');
    openWhatsApp(getSettings().whatsapp, message);
  };

  return (
    <div className="container-px py-3">
      <button
        type="button"
        onClick={handleTrack}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-accentDeep/40 bg-accent/10 px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-accent/20"
      >
        <PackageSearch size={18} className="shrink-0 text-accentDeep" />
        <span>
          ¿Dónde está mi pedido?{' '}
          <span className="text-accentDeep underline underline-offset-2">Seguir por WhatsApp</span>
        </span>
      </button>
    </div>
  );
}
