'use client';

import { CHART_COLORS } from '@/lib/admin/constants';

export function Donut({ data }: { data: { method: string; total: number }[] }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (!total) return <p className="text-sm text-muted">Sin ventas.</p>;
  let acc = 0;
  return (
    <svg viewBox="0 0 42 42" className="h-40 w-40 flex-shrink-0">
      {data.map((d, i) => {
        const start = (acc / total) * 100;
        acc += d.total;
        const end = (acc / total) * 100;
        return (
          <circle
            key={d.method}
            cx="21"
            cy="21"
            r="15.9"
            fill="transparent"
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth="6"
            strokeDasharray={`${end - start} ${100 - (end - start)}`}
            strokeDashoffset={25 - start}
          />
        );
      })}
    </svg>
  );
}