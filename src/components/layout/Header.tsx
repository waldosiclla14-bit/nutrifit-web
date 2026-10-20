'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, Heart, Instagram, Menu, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { BRAND, CATEGORIES, GOALS } from '@/data/seed';
import SearchBox from '@/components/layout/SearchBox';

const NAV = [
  { href: '/', label: 'Inicio' },
  { href: '/productos', label: 'Catálogo' },
  { href: '/marcas', label: 'Marcas' },
  { href: '/#combos', label: 'Combos' },
  { href: '/#opiniones', label: 'Opiniones' },
];

export default function Header() {
  const { itemCount, openCart } = useCart();
  const { count: favCount } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<'cat' | 'goal' | null>(null);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-sport-border bg-sport-bg/90 backdrop-blur pt-safe">
        <div className="container-px flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="NutriFit – Inicio">
            <span className="font-display text-xl uppercase tracking-wide">
              Nutri<span className="text-sport-green">Fit</span>
            </span>
          </Link>

          <div className="hidden flex-1 justify-center md:flex">
            <SearchBox className="w-full max-w-sm" />
          </div>

          <nav className="hidden items-center gap-5 lg:flex">
            <div
              className="relative"
              onMouseEnter={() => setOpenMenu('cat')}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                type="button"
                aria-expanded={openMenu === 'cat'}
                onClick={() => setOpenMenu(openMenu === 'cat' ? null : 'cat')}
                className="flex items-center gap-1 text-sm font-semibold text-gray-900 transition-colors hover:text-sport-green"
              >
                Categorías
                <ChevronDown size={15} className={openMenu === 'cat' ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {openMenu === 'cat' && (
                <div className="absolute left-0 top-full z-50 w-[420px] rounded-2xl border border-sport-border bg-sport-card p-3 shadow-sportCard">
                  <div className="grid grid-cols-2 gap-1">
                    {CATEGORIES.map((c) => (
                      <Link
                        key={c.key}
                        href={`/productos?cat=${c.key}`}
                        onClick={() => setOpenMenu(null)}
                        className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-sport-surface hover:text-sport-green"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="relative"
              onMouseEnter={() => setOpenMenu('goal')}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                type="button"
                aria-expanded={openMenu === 'goal'}
                onClick={() => setOpenMenu(openMenu === 'goal' ? null : 'goal')}
                className="flex items-center gap-1 text-sm font-semibold text-gray-900 transition-colors hover:text-sport-green"
              >
                Por objetivo
                <ChevronDown size={15} className={openMenu === 'goal' ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {openMenu === 'goal' && (
                <div className="absolute left-0 top-full z-50 w-[320px] rounded-2xl border border-sport-border bg-sport-card p-3 shadow-sportCard">
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(GOALS).map(([key, label]) => (
                      <Link
                        key={key}
                        href={`/productos?goal=${key}`}
                        onClick={() => setOpenMenu(null)}
                        className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-sport-surface hover:text-sport-green"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {NAV.slice(1, 3).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-semibold text-gray-900 transition-colors hover:text-sport-green"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/#opiniones"
              className="text-sm font-semibold text-gray-900 transition-colors hover:text-sport-green"
            >
              Opiniones
            </Link>
          </nav>

          <div className="flex items-center gap-1.5">
            <a
              href={BRAND.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram NutriFit"
              className="hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 sm:flex"
            >
              <Instagram size={19} />
            </a>
            <Link
              href="/favoritos"
              aria-label="Mis favoritos"
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            >
              <Heart size={19} />
              {favCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-sport-orange px-1 text-[10px] font-bold text-white">
                  {favCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={openCart}
              aria-label="Abrir carrito"
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            >
              <ShoppingBag size={19} />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-sport-green px-1 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 lg:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-sport-border bg-sport-bg lg:hidden">
            <div className="container-px flex flex-col gap-1 py-4">
              <div className="mb-2">
                <SearchBox />
              </div>
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-100"
                >
                  {item.label}
                </Link>
              ))}

              <p className="mt-2 px-3 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">
                Categorías
              </p>
              <div className="flex flex-wrap gap-1.5 px-3 pb-1">
                {CATEGORIES.map((c) => (
                  <Link
                    key={c.key}
                    href={`/productos?cat=${c.key}`}
                    onClick={() => setMenuOpen(false)}
                    className="chip"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>

              <p className="mt-2 px-3 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">
                Por objetivo
              </p>
              <div className="flex flex-wrap gap-1.5 px-3 pb-1">
                {Object.entries(GOALS).map(([key, label]) => (
                  <Link
                    key={key}
                    href={`/productos?goal=${key}`}
                    onClick={() => setMenuOpen(false)}
                    className="chip"
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <Link
                href="/favoritos"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-100"
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
