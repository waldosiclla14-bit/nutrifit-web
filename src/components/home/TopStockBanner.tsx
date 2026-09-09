'use client';

import { motion } from 'framer-motion';
import { Package } from 'lucide-react';

const PACK_STOCK = 12;

export default function TopStockBanner() {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative z-50 bg-sport-surface border-b border-sport-border/40"
    >
      <div className="container-px flex items-center justify-center gap-2.5 py-2.5 text-center">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-sport-green" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-sport-green" />
        </span>
        <p className="text-[13px] font-semibold tracking-wide text-white/80">
          <span className="text-white">Stock actualizado hoy:</span>{' '}
          Solo{' '}
          <span className="font-extrabold text-sport-green">
            {PACK_STOCK} packs
          </span>{' '}
          de Proteína + Creatina disponibles para entrega inmediata.
        </p>
        <Package size={14} className="hidden shrink-0 text-sport-green sm:block" />
      </div>
    </motion.div>
  );
}
