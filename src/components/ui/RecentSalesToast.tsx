'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { PRODUCTS } from '@/data/seed';

const NAMES = ['Valentina', 'Camila', 'Andrea', 'Fernanda', 'Paula', 'Josefa', 'Antonia', 'Matías'];
const PLACES = ['Santiago', 'Ñuñoa', 'Providencia', 'Las Condes', 'Maipú', 'La Florida'];
const TIMES = ['hace 12 min', 'hace 8 min', 'hace 4 min', 'hace 25 min', 'hace 1 hora'];

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function RecentSalesToast() {
  const [current, setCurrent] = useState<{ name: string; place: string; time: string; product: string } | null>(null);
  const reduced = useMemo(
    () =>
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false,
    [],
  );

  useEffect(() => {
    if (PRODUCTS.length === 0) return;
    let hideTimer: ReturnType<typeof setTimeout>;
    let showTimer: ReturnType<typeof setTimeout>;

    const show = () => {
      setCurrent({
        name: pick(NAMES),
        place: pick(PLACES),
        time: pick(TIMES),
        product: pick(PRODUCTS).name,
      });
      hideTimer = setTimeout(hide, 5200);
    };

    const hide = () => {
      setCurrent(null);
      showTimer = setTimeout(show, 9000);
    };

    showTimer = setTimeout(show, 6000);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(showTimer);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-[55] hidden sm:block">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.name + current.product}
            initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.45 }}
            className="flex items-center gap-3 rounded-2xl border border-line bg-paper/95 py-3 pl-3 pr-4 shadow-soft backdrop-blur"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/30 text-ink">
              <ShoppingBag size={15} />
            </span>
            <div className="max-w-[240px]">
              <p className="truncate text-xs font-semibold text-ink">
                {current.name} de {current.place}
              </p>
              <p className="truncate text-[11px] text-muted">
                compró «{current.product}» · {current.time}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
