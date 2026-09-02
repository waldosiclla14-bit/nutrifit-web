'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { openWhatsApp } from '@/lib/whatsapp';
import { getSettings } from '@/lib/store';
import { trackEvent } from '@/lib/analytics';

export default function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const showRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 1024) return;
    if (sessionStorage.getItem('exit-intent-shown')) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && !showRef.current && !sessionStorage.getItem('exit-intent-shown')) {
        showRef.current = true;
        setShow(true);
        sessionStorage.setItem('exit-intent-shown', '1');
        trackEvent('ExitIntentPopupShown');
      }
    };

    const handleTouchLeave = () => {
      if (document.visibilityState === 'hidden' && !sessionStorage.getItem('exit-intent-shown')) {
        showRef.current = true;
        setShow(true);
        sessionStorage.setItem('exit-intent-shown', '1');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleTouchLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleTouchLeave);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('ExitIntentPopupSubmit', { email });
    const message = [
      'HOLA NUTRIFIT',
      'QUIERO MI 10% OFF DE PRIMERA COMPRA',
      '─'.repeat(24),
      '',
      `*Email:* ${email}`,
      '',
      '¿Me mandan el cupón y la guía de suplementos?',
    ].join('\n');
    openWhatsApp(getSettings().whatsapp, message);
    setShow(false);
  };

  if (!show || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-paper p-8 shadow-2xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/25 blur-[80px]" />
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-full p-1.5 transition-colors hover:bg-soft"
        >
          <X size={18} />
        </button>

        <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-accentDeep">
          Espera, no te vayas
        </p>
        <h3 className="mt-2 font-display text-2xl uppercase leading-tight tracking-wide">
          Lleva <span className="text-accentDeep">10% OFF</span> en tu primera compra
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Deja tu email y te enviamos el cupón + guía de suplementos según tu objetivo.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            aria-label="Tu correo electrónico"
            className="w-full rounded-full border border-line bg-white px-5 py-3.5 text-sm outline-none transition-colors focus:border-accentDeep"
          />
          <button type="submit" className="btn-accent w-full">
            <MessageCircle size={16} /> Quiero mi cupón
          </button>
        </form>
        <p className="mt-3 text-center text-[11px] text-muted">
          Sin spam. Puedes darte de baja cuando quieras.
        </p>
      </div>
    </div>
  );
}
