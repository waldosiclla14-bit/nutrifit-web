'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Star } from 'lucide-react';
import type { UserReview } from '@/types';
import { getProductReviews, saveReview } from '@/lib/reviews';
import { formatDate } from '@/lib/utils';
import Stars from '@/components/ui/Stars';

export default function ProductReviews({
  productId,
  initialRating,
  reviewCount,
}: {
  productId: number;
  initialRating: number;
  reviewCount: number;
}) {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setReviews(getProductReviews(productId));
    setLoaded(true);
  }, [productId]);

  const average =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : initialRating;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) {
      setError('Completa tu nombre y tu reseña.');
      return;
    }
    if (text.trim().length < 5) {
      setError('Escribe al menos 5 caracteres.');
      return;
    }
    setReviews(saveReview(productId, name, rating, text.trim(), verified));
    setError('');
    setDone(true);
    setName('');
    setRating(5);
    setText('');
    setVerified(false);
  };

  return (
    <section className="mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-xl uppercase tracking-wide">Reseñas de clientes</h2>
        <div className="flex items-center gap-2 text-sm">
          <Stars rating={average} size={16} />
          <span className="font-bold">{average.toFixed(1)}</span>
          <span className="text-muted">
            ({reviews.length + reviewCount} reseñas)
          </span>
        </div>
      </div>

      {reviews.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <article key={r.id} className="rounded-3xl border border-line bg-paper p-5">
              <div className="flex items-center justify-between">
                <Stars rating={r.rating} size={14} />
                <span className="text-[11px] text-muted">{formatDate(r.createdAt)}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed">&ldquo;{r.text}&rdquo;</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">
                — {r.name}
              </p>
              {r.verified && (
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  ✓ Compra verificada
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mb-5 rounded-2xl border border-line bg-soft px-5 py-4 text-sm text-muted">
          Aún no hay reseñas de clientes para este producto. ¡Sé el primero en opinar!
        </p>
      )}

      <div className="mt-6 rounded-3xl border border-line bg-soft p-6">
        <h3 className="font-display text-lg uppercase tracking-wide">Cuéntanos tu experiencia</h3>
        {done && (
          <p className="mt-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accentDeep">
            ¡Gracias por tu reseña! Ya quedó publicada.
          </p>
        )}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} de 5 estrellas`}
                className="p-0.5"
              >
                <Star
                  size={22}
                  className={
                    n <= rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-soft2 text-soft2'
                  }
                />
              </button>
            ))}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            aria-label="Tu nombre"
            className="input"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Cómo te fue con este producto?"
            aria-label="Tu reseña"
            rows={3}
            className="input resize-none"
          />
          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            Compré este producto (compra verificada)
          </label>
          <button type="submit" className="btn-accent">
            <Star size={16} /> Publicar reseña
          </button>
        </form>
      </div>
    </section>
  );
}
