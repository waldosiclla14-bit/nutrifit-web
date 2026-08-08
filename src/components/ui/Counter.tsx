'use client';

import { useEffect, useRef, useState } from 'react';

export default function Counter({
  end,
  suffix = '',
  decimal = false,
  duration = 1600,
}: {
  end: number;
  suffix?: string;
  decimal?: boolean;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const startTime = performance.now();
            const tick = (now: number) => {
              const progress = Math.min((now - startTime) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              const current = decimal ? end * eased : Math.floor(end * eased);
              setValue(current);
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, decimal, duration]);

  const display = decimal ? value.toFixed(1) : Math.round(value).toLocaleString('es-CL');

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}
