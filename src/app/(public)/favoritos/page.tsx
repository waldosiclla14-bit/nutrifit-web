'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { PRODUCTS } from '@/data/seed';
import { useFavorites } from '@/context/FavoritesContext';
import ProductCard from '@/components/product/ProductCard';

export default function FavoritesPage() {
  const { ids } = useFavorites();
  const favorites = PRODUCTS.filter((p) => ids.includes(p.id));

  return (
    <div className="container-px py-10">
      <p className="section-label">MIS FAVORITOS</p>
      <h1 className="section-title mb-8">
        Tus productos <span className="text-sport-orange">guardados</span>
      </h1>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {favorites.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-sport-border bg-sport-surface p-14 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sport-card">
            <Heart size={26} className="text-white/50" />
          </div>
          <p className="mt-5 font-display text-xl uppercase tracking-wide">Sin favoritos</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/50">
            Marca el corazón en cualquier producto para guardarlo aquí y encontrarlo rápido cuando
            quieras.
          </p>
          <Link href="/productos" className="btn-primary mt-6">
            Explorar catálogo
          </Link>
        </div>
      )}
    </div>
  );
}
