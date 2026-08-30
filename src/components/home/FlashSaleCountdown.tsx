'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

function getTimeLeft() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const diff = end.getTime() - now.getTime();
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function FlashSaleCountdown() {
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 text-xs font-bold text-accentDeep">
        <Zap size={13} /> Termina hoy
      </span>
      <div className="flex items-center gap-1.5">
        {[
          { value: time.hours, label: 'hr' },
          { value: time.minutes, label: 'min' },
          { value: time.seconds, label: 'seg' },
        ].map((unit, i) => (
          <span key={unit.label} className="flex items-center gap-1">
            <span className="flex h-8 min-w-[32px] items-center justify-center rounded-lg bg-ink px-1.5 text-sm font-bold text-paper tabular-nums">
              {pad(unit.value)}
            </span>
            <span className="text-[10px] text-muted">{unit.label}</span>
            {i < 2 && <span className="text-xs text-muted">:</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
