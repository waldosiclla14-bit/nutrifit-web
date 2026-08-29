'use client';

import { formatPrice } from '@/lib/utils';

export function Bars7({ data }: { data: { date: string; total: number; profit: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((d) => (
        <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <div className="w-full rounded-t-md bg-accent/70" style={{ height: `${Math.max((d.total / max) * 100, 3)}%` }} title={formatPrice(d.total)} />
          <span className="text-[10px] text-muted">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}