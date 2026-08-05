import Stars from '@/components/ui/Stars';
import { cx } from '@/lib/utils';

type Props = {
  rating: number;
  count: number;
  className?: string;
};

export default function RatingSummary({ rating, count, className }: Props) {
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <Stars rating={rating} size={14} />
      <span className="text-xs font-semibold text-ink">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted">· {count} opiniones</span>
    </div>
  );
}
