import Stars from '@/components/ui/Stars';
import { cx } from '@/lib/utils';

type Props = {
  rating: number;
  count: number;
  className?: string;
};

/**
 * Nota y estrellas de un producto. No se renderiza si no hay reseñas:
 * antes se mostraba "4.9 · 0 opiniones" en productos sin ninguna.
 */
export default function RatingSummary({ rating, count, className }: Props) {
  if (!count || count < 1) return null;

  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <Stars rating={rating} size={14} />
      <span className="text-xs font-semibold text-ink">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted">· {count} opiniones</span>
    </div>
  );
}
