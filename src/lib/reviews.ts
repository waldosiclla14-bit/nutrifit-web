import type { UserReview } from '@/types';
import { uid } from '@/lib/utils';

const KEY = 'nutrifit:reviews';

export function loadReviews(): UserReview[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserReview[]) : [];
  } catch {
    return [];
  }
}

export function getProductReviews(productId: number): UserReview[] {
  return loadReviews()
    .filter((r) => r.productId === productId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function saveReview(
  productId: number,
  name: string,
  rating: number,
  text: string,
): UserReview[] {
  const review: UserReview = {
    id: uid('RV'),
    productId,
    name: name.trim(),
    rating,
    text: text.trim(),
    createdAt: Date.now(),
  };
  const reviews = [review, ...loadReviews()];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(reviews));
  } catch {
    // storage may be unavailable — ignore
  }
  return reviews.filter((r) => r.productId === productId);
}
