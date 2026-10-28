import { getProductReviews, saveReview } from './reviews';

/**
 * El backend usa `setGlobalPrefix('api')` (backend/src/main.ts). Las reseñas
 * se pedían a `${API_BASE}/reviews/...`, sin el prefijo, así que respondían
 * 404: la ficha de producto nunca mostraba reseñas y enviar una fallaba.
 */
describe('reviews API', () => {
  const originalFetch = global.fetch;
  let calls: string[] = [];

  beforeEach(() => {
    calls = [];
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lee las reseñas bajo /api/reviews', async () => {
    global.fetch = jest.fn(async (url: any) => {
      calls.push(String(url));
      return { ok: true, json: async () => [] } as any;
    }) as any;

    await getProductReviews('whey-protein');

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/\/api\/reviews\/product\/whey-protein$/);
  });

  it('publica la reseña bajo /api/reviews', async () => {
    global.fetch = jest.fn(async (url: any) => {
      calls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          id: 'r1',
          productSlug: 'whey-protein',
          name: 'Ana',
          rating: 5,
          text: 'Excelente',
          createdAt: new Date().toISOString(),
          verified: true,
        }),
      } as any;
    }) as any;

    const review = await saveReview('whey-protein', 'Ana', 5, 'Excelente');

    expect(calls[0]).toMatch(/\/api\/reviews$/);
    expect(review.rating).toBe(5);
  });

  it('no rompe la ficha si el backend falla', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500 }) as any) as any;

    await expect(getProductReviews('whey-protein')).resolves.toEqual([]);
  });
});
