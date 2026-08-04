'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Heart, Instagram, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { BRAND } from '@/data/seed';
import { openWhatsApp } from '@/lib/whatsapp';
import { getSettings } from '@/lib/store';

const NAV = [
  { href: '/', label: 'Inicio' },
  { href: '/productos', label: 'Catálogo' },
  { href: '/#combos', label: 'Combos' },
  { href: '/#beneficios', label: 'Beneficios' },
  { href: '/#opiniones', label: 'Opiniones' },
];

export default function Header() {
  const router = useRouter();
  const { itemCount, openCart } = useCart();
  const { count: favCount } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : '/productos');
  };

  return (
    <>
      <div className="bg-dark text-white">
        <div className="container-px flex items-center justify-center gap-2 py-2 text-center text-xs font-semibold tracking-wide sm:text-sm">
          <span className="text-accent">FLASH SALE:</span>
          <span className="text-white/90">
            Hasta 16% OFF en suplementos · Envío gratis en Metro sobre $40.000
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="container-px flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="NutriFit – Inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo.png" alt="NUTRIFIT" className="h-10 w-auto" />
            <span className="font-display text-xl uppercase tracking-wide">
              Nutri<span className="text-accentDeep">Fit</span>
            </span>
          </Link>

          <form onSubmit={onSearch} className="hidden flex-1 justify-center md:flex">
            <div className="relative w-full max-w-sm">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar producto, marca, beneficio..."
                aria-label="Buscar productos"
                className="input pl-10"
              />
            </div>
          </form>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-semibold text-ink transition-colors hover:text-accentDeep"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <a
              href={BRAND.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram NutriFit"
              className="hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-soft sm:flex"
            >
              <Instagram size={19} />
            </a>
            <Link
              href="/favoritos"
              aria-label="Mis favoritos"
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-soft"
            >
              <Heart size={19} />
              {favCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">
                  {favCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={openCart}
              aria-label="Abrir carrito"
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-soft"
            >
              <ShoppingBag size={19} />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-ink">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => openWhatsApp(getSettings().whatsapp, 'Hola NutriFit! Quiero hacer un pedido.')}
              aria-label="WhatsApp NutriFit"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white transition-transform hover:scale-105"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Abrir menú"
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-soft lg:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-line bg-paper lg:hidden">
            <div className="container-px flex flex-col gap-1 py-4">
              <form onSubmit={onSearch} className="mb-2">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar producto, marca, beneficio..."
                    aria-label="Buscar productos"
                    className="input pl-10"
                  />
                </div>
              </form>
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-soft"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/favoritos"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-soft"
              >
                <Heart size={16} /> Mis favoritos
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
