'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { openWhatsApp } from '@/lib/whatsapp';
import { getSettings } from '@/lib/store';
import { trackEvent } from '@/lib/analytics';

const STORAGE_KEY = 'nutrifit:first-order-offer';
const OFFER_TTL = 30 * 24 * 60 * 60 * 1000;

function markShown() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* storage no disponible */
  }
}

function wasShown() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    return Date.now() - Number(saved) < OFFER_TTL;
  } catch {
    return true;
  }
}

export default function FirstOrderOffer() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || wasShown()) return;
    if (window.innerWidth < 1024) return;

    let armed = false;
    const armTimer = setTimeout(() => {
      armed = true;
    }, 6000);

    const maybeShow = () => {
      if (!armed || wasShown() || show) return;
      setShow(true);
      markShown();
      trackEvent('FirstOrderOfferShown');
    };

    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && armed) maybeShow();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && armed) maybeShow();
    };

    const onScrollUp = () => {
      if (window.scrollY < 40 && armed) maybeShow();
    };

    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('scroll', onScrollUp, { passive: true });

    return () => {
      clearTimeout(armTimer);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('scroll', onScrollUp);
    };
  }, [show]);

  const handleClaim = () => {
    trackEvent('FirstOrderOfferClaim');
    const message = [
      'HOLA NUTRIFIT',
      'QUIERO MI 5% OFF DE PRIMERA COMPRA',
      '─'.repeat(24),
      '',
      '*Cupón:* NUTRIFIT5',
      '',
      '¿Me lo aplican a mi pedido?',
    ].join('\n');
    openWhatsApp(getSettings().whatsapp, message);
    markShown();
    setShow(false);
  };

  const handleClose = () => {
    markShown();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="5% OFF en tu primer pedido"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-paper p-8 shadow-2xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/25 blur-[80px]" />
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-full p-1.5 transition-colors hover:bg-soft"
        >
          <X size={18} />
        </button>

        <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-accentDeep">
          Bienvenido a NUTRIFIT
        </p>
        <h3 className="mt-2 font-display text-3xl uppercase leading-tight tracking-wide">
          Lleva <span className="text-accentDeep">5% OFF</span> en tu primer pedido
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Usa tu cupón de bienvenida en tu primera compra por WhatsApp y empieza a entrenar
          con confianza.
        </p>

        <div className="mt-6 rounded-2xl border-2 border-dashed border-accentDeep/50 bg-accent/10 px-5 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Tu cupón</p>
          <p className="font-display text-2xl uppercase tracking-widest text-ink">NUTRIFIT5</p>
        </div>

        <button type="button" onClick={handleClaim} className="btn-accent mt-6 w-full">
          <MessageCircle size={16} /> Quiero mi 5% OFF
        </button>
        <p className="mt-3 text-center text-[11px] text-muted">
          Válido en tu primer pedido. Aplica sobre el total.
        </p>
      </div>
    </div>
  );
}
