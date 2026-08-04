'use client';

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { CATEGORIES, GOALS, PRODUCTS } from '@/data/seed';
import ProductCard from '@/components/product/ProductCard';
import Reveal from '@/components/ui/Reveal';
import { cx, getDiscount } from '@/lib/utils';

type SortKey = 'relevancia' | 'oferta' | 'vendidos' | 'precio-asc' | 'precio-desc';

const PRICE_PRESETS = [
  { key: 'all', label: 'Todos', test: () => true },
  { key: '0-15000', label: 'Hasta $15.000', test: (p: number) => p <= 15000 },
  { key: '15000-20000', label: '$15.000 – $20.000', test: (p: number) => p > 15000 && p <= 20000 },
  { key: '20000-25000', label: '$20.000 – $25.000', test: (p: number) => p > 20000 && p <= 25000 },
  { key: '25000+', label: 'Más de $25.000', test: (p: number) => p > 25000 },
];

const BRANDS = ['NutriFit', 'FullEnergic', 'Rain', 'FNL'];

export default function Catalog({
  initialCat,
  initialQ,
}: {
  initialCat?: string;
  initialQ?: string;
}) {
  const [cat, setCat] = useState(initialCat ?? '');
  const [q, setQ] = useState(initialQ ?? '');
  const [sort, setSort] = useState<SortKey>('relevancia');
  const [brands, setBrands] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [price, setPrice] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const toggleBrand = (b: string) =>
    setBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  const toggleGoal = (g: string) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const clearFilters = () => {
    setCat('');
    setQ('');
    setBrands([]);
    setGoals([]);
    setPrice('all');
  };

  const hasFilters = cat || q || brands.length > 0 || goals.length > 0 || price !== 'all';

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const priceTest = PRICE_PRESETS.find((p) => p.key === price)?.test ?? (() => true);

    let list = PRODUCTS.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (query) {
        const haystack = [p.name, p.brand, p.categoryLabel, ...p.tags].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (brands.length && !brands.includes(p.brand)) return false;
      if (goals.length && !goals.some((g) => p.goal.includes(g))) return false;
      if (!priceTest(p.price)) return false;
      return true;
    });

    switch (sort) {
      case 'oferta':
        list = [...list].sort((a, b) => (getDiscount(b) ?? 0) - (getDiscount(a) ?? 0));
        break;
      case 'vendidos':
        list = [...list].sort((a, b) => b.reviews - a.reviews);
        break;
      case 'precio-asc':
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case 'precio-desc':
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }
    return list;
  }, [cat, q, sort, brands, goals, price]);

  return (
    <div className="container-px py-10">
      <Reveal className="mb-8">
        <p className="section-label">CATÁLOGO</p>
        <h1 className="section-title">
          Suplementos <span className="text-accentDeep">premium</span>
        </h1>
      </Reveal>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCat('')}
            className={cx(
              'chip shrink-0 !px-4 !py-1.5 text-xs font-bold uppercase tracking-wide',
              !cat ? 'bg-ink text-white' : 'bg-paper hover:border-accent',
            )}
          >
            Todos
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCat(cat === c.key ? '' : c.key)}
              className={cx(
                'chip shrink-0 !px-4 !py-1.5 text-xs font-bold uppercase tracking-wide',
                cat === c.key ? 'bg-ink text-white' : 'bg-paper hover:border-accent',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cx(
              'chip gap-1.5 !px-4 !py-2.5 text-xs font-bold uppercase tracking-wide',
              showFilters ? 'bg-ink text-white' : 'bg-paper hover:border-accent',
            )}
          >
            <SlidersHorizontal size={14} /> Filtros
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Ordenar productos"
            className="input !w-auto !py-2.5 text-xs font-semibold"
          >
            <option value="relevancia">Relevancia</option>
            <option value="oferta">Ofertas</option>
            <option value="vendidos">Más vendidos</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="mb-8 rounded-3xl border border-line bg-soft p-5">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="label">Buscar</h3>
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Producto, marca, beneficio..."
                  aria-label="Buscar productos"
                  className="input pl-9"
                />
              </div>
            </div>
            <div>
              <h3 className="label">Marca</h3>
              <div className="flex flex-wrap gap-2">
                {BRANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBrand(b)}
                    className={cx(
                      'chip',
                      brands.includes(b) ? 'bg-ink text-white' : 'bg-paper hover:border-accent',
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="label">Objetivo</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(GOALS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleGoal(key)}
                    className={cx(
                      'chip',
                      goals.includes(key) ? 'bg-ink text-white' : 'bg-paper hover:border-accent',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5">
            <h3 className="label">Precio</h3>
            <div className="flex flex-wrap gap-2">
              {PRICE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPrice(p.key)}
                  className={cx(
                    'chip',
                    price === p.key ? 'bg-ink text-white' : 'bg-paper hover:border-accent',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 text-xs font-bold uppercase tracking-wide text-accentDeep underline underline-offset-4"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <p className="mb-5 text-sm text-muted">
        <strong className="text-ink">{results.length}</strong> producto{results.length === 1 ? '' : 's'}
      </p>

      {results.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-line bg-soft p-12 text-center">
          <p className="font-display text-xl uppercase tracking-wide">Sin resultados</p>
          <p className="mt-2 text-sm text-muted">
            No encontramos productos con esos filtros. Prueba con otros términos.
          </p>
          <button type="button" onClick={clearFilters} className="btn-primary mt-6">
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
