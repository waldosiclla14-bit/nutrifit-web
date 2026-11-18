'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { BUNDLES, PRODUCTS } from '@/data/seed';
import { useCart } from '@/context/CartContext';
import { bundlePricing, formatPrice } from '@/lib/utils';

export default function StickyBottomBar() {
  const { addBundle } = useCart();
  const [visible, setVisible] = useState(false);
  const pack = BUNDLES.find((b) => b.id === 'pack-proteina-creatina');
  const price = pack
    ? bundlePricing(pack, (id) => PRODUCTS.find((p) => p.id === id)).price
    : 0;
  const title = pack?.title ?? 'Pack Proteína + Creatina';

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const addPack = () => {
    if (!pack) return;
    addBundle(pack, { 4: 'Vainilla' });
  };

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-sport-border/50 bg-sport-bg/95 px-4 py-3 backdrop-blur-xl transition-transform duration-300 motion-reduce:transition-none lg:hidden ${
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
    >
      <div className="container-px flex items-center gap-3">
        {/* Mini image */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-50">
          <Image
            src="/img/producto1.webp"
            alt="Pack Proteína + Creatina"
            fill
            sizes="48px"
            className="object-contain p-1"
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-gray-900">{title}</p>
          <p className="font-display text-xl tracking-wide text-sport-greenText">
            {formatPrice(price)}
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={addPack}
          className="flex h-11 items-center gap-2 rounded-full bg-sport-green px-5 text-[13px] font-extrabold text-ink shadow-sportGlow transition-colors hover:bg-sport-greenLight focus-visible:ring-2 focus-visible:ring-sport-green"
        >
          <ShoppingBag size={16} />
          Agregar
        </button>
      </div>
    </div>
  );
}
