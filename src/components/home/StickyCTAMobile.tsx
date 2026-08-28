'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { MessageCircle } from 'lucide-react';
import { BUNDLES } from '@/data/seed';
import { cx, formatPrice } from '@/lib/utils';

const WHATSAPP_LINK =
  'https://wa.me/56923883826?text=Hola!%20Vi%20el%20Pack%20Inicio%20de%20%2427.500%2C%20%C2%BFqu%C3%A9%20sabor%20te%20queda%20para%20ma%C3%B1ana%3F';

export default function StickyCTAMobile() {
  const [show, setShow] = useState(false);
  const pack = BUNDLES.find((b) => b.id === 'pack-proteina-creatina');

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 300);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!pack) return null;

  return (
    <div
      className={cx(
        'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 lg:hidden',
        show ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="flex items-center gap-3">
        <Image
          src={pack.image ?? '/img/producto1.webp'}
          alt={pack.title}
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain ring-1 ring-line"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-tight text-ink">{pack.title}</p>
          <p className="font-display text-sm leading-none tracking-wide text-accentDeep">
            {formatPrice(pack.fixedPrice ?? 27500)}
          </p>
        </div>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-3 text-xs font-extrabold text-white transition-transform active:scale-[0.98]"
        >
          <MessageCircle size={15} />
          Pedir por WhatsApp
        </a>
      </div>
    </div>
  );
}
