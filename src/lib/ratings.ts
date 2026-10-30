import type { Product } from '@/types';

export type Rated = { rating: number; reviews: number };

/**
 * Promedio ponderado por cantidad de reseñas.
 *
 * Devuelve `null` cuando no hay reseñas suficientes: en ese caso la interfaz
 * no debe mostrar estrellas ni nota (antes se mostraba "4.9 (0)").
 */
export function summarizeRatings(
  items: Rated[],
  minCount = 1,
): { rating: number; count: number } | null {
  const valid = items.filter(
    (i) => Number.isFinite(i.reviews) && i.reviews >= minCount && Number.isFinite(i.rating),
  );
  const count = valid.reduce((acc, i) => acc + i.reviews, 0);
  if (count < minCount) return null;
  const weighted = valid.reduce((acc, i) => acc + i.rating * i.reviews, 0);
  return { rating: Number((weighted / count).toFixed(1)), count };
}

/**
 * Reseñas de un pack calculadas solo con los productos que lo componen.
 * Evita el error de sumar reseñas de productos que no están en el set.
 */
export function summarizeBundleRatings(
  components: Product[],
  minCount = 1,
): { rating: number; count: number } | null {
  return summarizeRatings(
    components.map((p) => ({ rating: p.rating, reviews: p.reviews })),
    minCount,
  );
}
