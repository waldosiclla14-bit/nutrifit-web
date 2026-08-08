'use client';

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';

export default function LiveViewers({ productId }: { productId: number }) {
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    setViewers(Math.floor(Math.random() * 8) + 3);
    const interval = setInterval(() => {
      setViewers((v) => Math.max(1, v + Math.floor(Math.random() * 5) - 2));
    }, 30000);
    return () => clearInterval(interval);
  }, [productId]);

  if (viewers === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-ink/70">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <Eye size={13} className="text-muted" />
      <span>
        <strong className="text-ink">{viewers}</strong> personas viendo esto ahora
      </span>
    </div>
  );
}
