import { listingStatusLabels } from '@cp/core';
import type { Enums } from '@cp/types';

import { cn } from '@/lib/utils';

const listingStyles: Record<Enums<'listing_status'>, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-warning/15 text-warning',
  active: 'bg-success/15 text-success',
  reserved: 'bg-primary/15 text-primary',
  sold: 'bg-foreground/10 text-foreground',
  archived: 'border border-dashed text-muted-foreground',
};

export function ListingStatusBadge({
  status,
  className,
}: {
  status: Enums<'listing_status'>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        listingStyles[status],
        className,
      )}
    >
      {listingStatusLabels[status]}
    </span>
  );
}

const dealerStyles: Record<Enums<'dealer_status'>, string> = {
  pending: 'bg-warning/15 text-warning',
  approved: 'bg-success/15 text-success',
  rejected: 'bg-destructive/15 text-destructive',
  suspended: 'bg-destructive/15 text-destructive',
};

export function DealerStatusBadge({
  status,
  className,
}: {
  status: Enums<'dealer_status'>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        dealerStyles[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
