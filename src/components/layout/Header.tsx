'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Heart, Instagram, Menu, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { BRAND } from '@/data/seed';
import SearchBox from '@/components/layout/SearchBox';

const NAV = [
  { href: '/', label: 'Inicio' },
  { href: '/productos', label: 'Catálogo' },
  { href: '/#combos', label: 'Combos' },
  { href: '/#beneficios', label: 'Beneficios' },
  { href: '/#opiniones', label: 'Opiniones' },
];

export default function Header() {
  const { itemCount, openCart } = useCart();
  const { count: favCount } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="container-px flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="NutriFit – Inicio">
            <span className="font-display text-xl uppercase tracking-wide">
              Nutri<span className="text-accentDeep">Fit</span>
            </span>
          </Link>

          <div className="hidden flex-1 justify-center md:flex">
            <SearchBox className="w-full max-w-sm" />
          </div>

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
              <div className="mb-2">
                <SearchBox />
              </div>
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
