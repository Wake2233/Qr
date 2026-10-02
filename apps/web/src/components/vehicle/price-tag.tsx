import { formatPrice } from '@cp/core';

import { cn } from '@/lib/utils';

interface PriceTagProps {
  cents: number;
  className?: string;
}

export function PriceTag({ cents, className }: PriceTagProps) {
  return (
    <span className={cn('font-display text-2xl font-semibold tabular-nums', className)}>
      {formatPrice(cents)}
    </span>
  );
}
