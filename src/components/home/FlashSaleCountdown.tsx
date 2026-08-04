'use client';

import { useEffect, useState } from 'react';

type Left = { h: number; m: number; s: number };

function msToMidnight(): Left {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let diff = Math.max(0, end.getTime() - now.getTime());
  const h = Math.floor(diff / 3600000);
  diff -= h * 3600000;
  const m = Math.floor(diff / 60000);
  diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  return { h, m, s };
}

const pad = (n: number) => String(n).padStart(2, '0');

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center px-1">
      <span className="font-display text-lg leading-none text-accent" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {pad(value)}
      </span>
      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/60">{label}</span>
    </div>
  );
}

export default function FlashSaleCountdown() {
  const [left, setLeft] = useState<Left | null>(null);

  useEffect(() => {
    setLeft(msToMidnight());
    const id = setInterval(() => setLeft(msToMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!left) return null;

  return (
    <div className="inline-flex items-center overflow-hidden rounded-full bg-ink px-3 py-1.5 shadow-card">
      <Unit value={left.h} label="hrs" />
      <span className="text-accent">:</span>
      <Unit value={left.m} label="min" />
      <span className="text-accent">:</span>
      <Unit value={left.s} label="seg" />
    </div>
  );
}
