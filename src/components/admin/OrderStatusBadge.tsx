'use client';

import { STATUS_LABEL, STATUS_STYLE } from '@/lib/admin/constants';
import { cn } from '@/lib/utils';

// Order status pill with the full 8-status color scale.
// (Restores the color coding lost when migrating to the generic Badge.)
export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
        STATUS_STYLE[status] || 'border-line bg-soft text-muted',
        className,
      )}
    >
      {STATUS_LABEL[status] || status}
    </span>
  );
}
