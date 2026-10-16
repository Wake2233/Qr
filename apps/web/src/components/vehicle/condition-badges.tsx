import { conditionBadges, type ConditionBadge } from '@cp/core';
import { CircleAlert, CircleCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

type BadgeSource = Parameters<typeof conditionBadges>[0];

/** "Run & Drive · No damage · Clean title · 1 owner": short, calm trust signals near the price. */
export function ConditionBadges({
  vehicle,
  className,
}: {
  vehicle: BadgeSource;
  className?: string;
}) {
  const badges = conditionBadges(vehicle);
  if (badges.length === 0) return null;
  return (
    <ul aria-label="Condition and history" className={cn('flex flex-wrap gap-1.5', className)}>
      {badges.map((badge) => (
        <li key={badge.key}>
          <Badge badge={badge} />
        </li>
      ))}
    </ul>
  );
}

function Badge({ badge }: { badge: ConditionBadge }) {
  const positive = badge.tone === 'positive';
  const Icon = positive ? CircleCheck : CircleAlert;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        positive
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
          : 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {badge.label}
    </span>
  );
}
