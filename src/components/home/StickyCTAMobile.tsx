'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { BRAND } from '@/data/seed';
import { cx } from '@/lib/utils';

export default function StickyCTAMobile() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 500);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={cx(
        'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 lg:hidden',
        show ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <a
        href={`https://wa.me/${BRAND.whatsappDigits}?text=${encodeURIComponent(
          'Hola NUTRIFIT, quiero comprar suplementos. ¿Me ayudan?',
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
      >
        <MessageCircle size={18} />
        Comprar por WhatsApp
      </a>
    </div>
  );
}
