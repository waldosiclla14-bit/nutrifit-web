import { Star } from 'lucide-react';

export default function Stars({
  rating,
  size = 14,
}: {
  rating: number;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={
            n <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-soft2 text-soft2'
          }
        />
      ))}
    </div>
  );
}
