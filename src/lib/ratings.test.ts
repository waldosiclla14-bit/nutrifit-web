import { summarizeRatings, summarizeBundleRatings } from './ratings';
import type { Product } from '@/types';

const rated = (rating: number, reviews: number) => ({ rating, reviews }) as Product;

describe('summarizeRatings', () => {
  it('pondera por cantidad de reseñas, no por promedio simple', () => {
    const result = summarizeRatings([
      { rating: 5.0, reviews: 100 },
      { rating: 3.0, reviews: 1 },
    ]);
    // (5*100 + 3*1) / 101 = 4.98, redondeado a 1 decimal -> 5.0
    expect(result?.count).toBe(101);
    expect(result?.rating).toBe(5);
  });

  it('devuelve null cuando no hay reseñas (no se muestran estrellas)', () => {
    expect(summarizeRatings([{ rating: 4.9, reviews: 0 }])).toBeNull();
    expect(summarizeRatings([])).toBeNull();
  });

  it('respeta el mínimo configurado', () => {
    const result = summarizeRatings(
      [
        { rating: 4.0, reviews: 1 },
        { rating: 5.0, reviews: 10 },
      ],
      5,
    );
    expect(result?.count).toBe(10);
    expect(result?.rating).toBe(5);
  });

  it('ignora valores no finitos', () => {
    const result = summarizeRatings([
      { rating: Number.NaN, reviews: 4 },
      { rating: 4.0, reviews: Number.POSITIVE_INFINITY },
      { rating: 4.5, reviews: 2 },
    ]);
    expect(result).toEqual({ rating: 4.5, count: 2 });
  });
});

describe('summarizeBundleRatings', () => {
  // Cifras reales del seed: whey FullEnergic (617) + creatina Eco Naturales (12).
  it('suma solo los productos que componen el pack', () => {
    const result = summarizeBundleRatings([rated(4.9, 617), rated(4.9, 12)]);
    expect(result?.count).toBe(629);
    expect(result?.rating).toBe(4.9);
  });

  it('no inventa reseñas si los productos no tienen', () => {
    expect(summarizeBundleRatings([rated(4.8, 0)])).toBeNull();
  });
});
