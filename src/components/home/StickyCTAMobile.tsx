'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { BUNDLES } from '@/data/seed';
import { useCart } from '@/context/CartContext';
import { cx, formatPrice } from '@/lib/utils';

export default function StickyCTAMobile() {
  const [show, setShow] = useState(false);
  const { addBundle, openCart } = useCart();
  const pack = BUNDLES.find((b) => b.id === 'pack-proteina-creatina');

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 300);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!pack) return null;

  const addPack = () => {
    addBundle(pack, { 4: 'Vainilla' });
    openCart();
  };

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
        <button
          onClick={addPack}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-3 text-xs font-extrabold text-ink transition-transform active:scale-[0.98]"
        >
          <ShoppingBag size={15} />
          Agregar al carrito
        </button>
      </div>
    </div>
  );
}
