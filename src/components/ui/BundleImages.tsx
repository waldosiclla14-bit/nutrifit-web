import Image from 'next/image';
import type { Product } from '@/types';
import { cx } from '@/lib/utils';

/**
 * Composición visual de un pack: una imagen por producto que lo contiene,
 * separadas por un "+".
 *
 * Sustituye al campo `bundle.image`, que en varios sets apuntaba a un producto
 * distinto del que se vende (ver docs/AUDIT.md, F-03).
 */
export default function BundleImages({
  products,
  sizes,
  padding = 'p-3',
  className,
}: {
  products: Product[];
  sizes: string;
  padding?: string;
  className?: string;
}) {
  if (products.length === 0) {
    return <div className={cx('h-full w-full bg-sport-surface', className)} aria-hidden="true" />;
  }

  return (
    <div className={cx('relative flex h-full w-full items-center justify-center', className)}>
      {products.map((product) => (
        <div key={product.id} className="relative h-full min-w-0 flex-1">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes={sizes}
            className={cx('object-contain', padding)}
          />
        </div>
      ))}
      {products.length > 1 && (
        <span
          aria-hidden="true"
          className="absolute z-10 flex h-8 w-8 items-center justify-center rounded-full border border-sport-border bg-sport-card text-base font-extrabold text-sport-green shadow-sm"
        >
          +
        </span>
      )}
    </div>
  );
}
