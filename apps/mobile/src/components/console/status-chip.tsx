import { listingStatusLabels } from '@cp/core';
import type { Enums } from '@cp/types';

import { Text } from '@/components/text';
import { cn } from '@/lib/cn';

const listing: Record<Enums<'listing_status'>, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-warning/15 text-warning',
  active: 'bg-success/15 text-success',
  reserved: 'bg-primary/15 text-primary',
  sold: 'bg-foreground/10 text-foreground',
  archived: 'border border-dashed border-border text-muted-foreground',
};

export function ListingStatusChip({
  status,
  className,
}: {
  status: Enums<'listing_status'>;
  className?: string;
}) {
  return (
    <Text
      className={cn(
        'self-start overflow-hidden rounded-full px-2.5 py-0.5 font-sans-medium text-xs',
        listing[status],
        className,
      )}
    >
      {listingStatusLabels[status]}
    </Text>
  );
}

const dealer: Record<Enums<'dealer_status'>, string> = {
  pending: 'bg-warning/15 text-warning',
  approved: 'bg-success/15 text-success',
  rejected: 'bg-destructive/15 text-destructive',
  suspended: 'bg-destructive/15 text-destructive',
};

export function DealerStatusChip({ status }: { status: Enums<'dealer_status'> }) {
  return (
    <Text
      className={cn(
        'self-start overflow-hidden rounded-full px-2.5 py-0.5 font-sans-medium text-xs capitalize',
        dealer[status],
      )}
    >
      {status}
    </Text>
  );
}

/** Horizontally scrolling filter chip. */
export function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Text
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        'overflow-hidden rounded-full border px-3.5 py-2 font-sans-medium text-sm',
        selected
          ? 'border-foreground bg-foreground text-background'
          : 'border-border text-foreground',
      )}
    >
      {label}
    </Text>
  );
}
