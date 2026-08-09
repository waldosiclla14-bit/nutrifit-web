'use client';

import { MessageCircle } from 'lucide-react';
import { openWhatsApp } from '@/lib/whatsapp';
import { getSettings } from '@/lib/store';

export default function BestSellerCTA() {
  const handleHelp = () => {
    const message = [
      'HOLA NUTRIFIT',
      'QUIERO ASESORÍA',
      '─'.repeat(24),
      '',
      'Hola, me gustaría que me recomienden entre los productos más vendidos.',
    ].join('\n');
    openWhatsApp(getSettings().whatsapp, message);
  };

  return (
    <div className="mt-8 flex flex-col items-center justify-between gap-4 overflow-hidden rounded-3xl bg-dark px-6 py-6 text-white sm:flex-row sm:px-8">
      <div>
        <p className="font-display text-2xl uppercase tracking-wide">
          ¿No sabes cuál <span className="text-accent">elegir</span>?
        </p>
        <p className="mt-1 text-sm text-white/70">
          Te asesoramos gratis según tu objetivo y resolvemos tus dudas por WhatsApp.
        </p>
      </div>
      <button type="button" onClick={handleHelp} className="btn-accent shrink-0">
        <MessageCircle size={16} /> Pedir ayuda
      </button>
    </div>
  );
}
