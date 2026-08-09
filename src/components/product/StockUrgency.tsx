'use client';

import { cx } from '@/lib/utils';

const URGENT = 5;
const LOW = 10;

export default function StockUrgency({
  stock,
  variant = 'badge',
}: {
  stock: number;
  variant?: 'badge' | 'bar';
}) {
  if (stock > LOW) return null;

  const low = stock <= URGENT;
  const label = low ? `¡Solo quedan ${stock} unidades!` : `Quedan pocas: ${stock} unidades`;
  const barPct = Math.min(100, (stock / 20) * 100);

  if (variant === 'bar') {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className={low ? 'text-red-700' : 'text-amber-700'}>{label}</span>
          <span
            className={cx(
              'rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide',
              low ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
            )}
          >
            Stock bajo
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-soft2">
          <div
            className={cx(
              'h-full rounded-full transition-all duration-500',
              low ? 'bg-red-500' : 'bg-amber-500',
            )}
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <span
      className={cx(
        'rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide',
        low ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
      )}
    >
      {label}
    </span>
  );
}
