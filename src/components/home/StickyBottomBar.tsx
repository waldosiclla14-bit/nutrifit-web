'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { BUNDLES } from '@/data/seed';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';

const PACK_PRICE = 27500;

export default function StickyBottomBar() {
  const { addBundle } = useCart();
  const [visible, setVisible] = useState(false);
  const pack = BUNDLES.find((b) => b.id === 'pack-proteina-creatina');

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
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-sport-border/50 bg-sport-bg/95 px-4 py-3 backdrop-blur-xl lg:hidden"
        >
          <div className="container-px flex items-center gap-3">
            {/* Mini image */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/[0.04]">
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
              <p className="truncate text-[13px] font-bold text-white">
                Pack Proteína + Creatina
              </p>
              <p className="font-display text-xl tracking-wide text-sport-green">
                {formatPrice(PACK_PRICE)}
              </p>
            </div>

            {/* CTA */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={addPack}
              className="flex h-11 items-center gap-2 rounded-full bg-sport-green px-5 text-[13px] font-extrabold text-white shadow-sportGlow"
            >
              <ShoppingBag size={16} />
              Agregar
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
