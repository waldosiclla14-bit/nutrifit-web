import type { UserReview } from '@/types';
import { API_BASE } from '@/lib/api';

export async function getProductReviews(productSlug: string): Promise<UserReview[]> {
  try {
    const res = await fetch(`${API_BASE}/reviews/product/${productSlug}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((r: any) => ({
      id: r.id,
      productSlug: r.productSlug,
      name: r.name,
      rating: r.rating,
      text: r.text,
      createdAt: new Date(r.createdAt).getTime(),
      verified: r.verified,
    }));
  } catch {
    return [];
  }
}

export async function saveReview(
  productSlug: string,
  name: string,
  rating: number,
  text: string,
  verified?: boolean,
): Promise<UserReview> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productSlug, name: name.trim(), rating, text: text.trim(), verified: !!verified }),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al guardar la reseña');
  }
  const r = await res.json();
  return {
    id: r.id,
    productSlug: r.productSlug,
    name: r.name,
    rating: r.rating,
    text: r.text,
    createdAt: new Date(r.createdAt).getTime(),
    verified: r.verified,
  };
}
