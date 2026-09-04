'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';
import { PRODUCTS } from '@/data/seed';
import { cx, formatPrice, getDiscount } from '@/lib/utils';

export default function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const q = query.trim().toLowerCase();
  const suggestions =
    q.length >= 2
      ? PRODUCTS.filter((p) =>
          [p.name, p.brand, p.categoryLabel, ...p.tags].join(' ').toLowerCase().includes(q),
        ).slice(0, 6)
      : [];

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    router.push(value ? `/productos?q=${encodeURIComponent(value)}` : '/productos');
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={cx('relative', className)}>
      <form onSubmit={onSubmit}>
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          placeholder="Buscar producto, marca, beneficio..."
          aria-label="Buscar productos"
          className="input pl-10"
        />
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
          <ul className="max-h-80 overflow-y-auto py-1">
            {suggestions.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/productos/${p.slug}`}
                  onClick={() => {
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-soft"
                >
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-lg border border-line bg-soft object-contain p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-snug">{p.name}</p>
                    <p className="text-[11px] text-muted">{p.categoryLabel}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-accentDeep">{formatPrice(p.price)}</p>
                    {getDiscount(p) && (
                      <p className="text-[11px] font-extrabold text-accentDeep">-{getDiscount(p)}%</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/productos?q=${encodeURIComponent(query.trim())}`}
            onClick={() => {
              setOpen(false);
              setQuery('');
            }}
            className="flex items-center justify-center gap-1.5 border-t border-line bg-soft px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-accentDeep transition-colors hover:bg-soft2"
          >
            Ver todos los resultados <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
