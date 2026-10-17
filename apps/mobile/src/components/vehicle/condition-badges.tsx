import { conditionBadges } from '@cp/core';
import { View } from 'react-native';

import { Text } from '@/components/text';
import { useLocale, useT } from '@/i18n';
import { cn } from '@/lib/cn';

type BadgeSource = Parameters<typeof conditionBadges>[0];

/** "Run & Drive · No damage · Clean title · 1 owner": short trust signals near the price. */
export function ConditionBadges({ vehicle }: { vehicle: BadgeSource }) {
  const t = useT();
  const badges = conditionBadges(vehicle, useLocale());
  if (badges.length === 0) return null;
  return (
    <View
      className="flex-row flex-wrap gap-1.5"
      accessibilityLabel={t.vehicle.conditionLabel(badges.map((b) => b.label).join(', '))}
    >
      {badges.map((badge) => (
        <View
          key={badge.key}
          className={cn(
            'rounded-full px-2.5 py-1',
            badge.tone === 'positive'
              ? 'bg-emerald-50 dark:bg-emerald-950'
              : 'bg-amber-50 dark:bg-amber-950',
          )}
        >
          <Text
            className={cn(
              'font-sans-medium text-xs',
              badge.tone === 'positive'
                ? 'text-emerald-800 dark:text-emerald-200'
                : 'text-amber-900 dark:text-amber-200',
            )}
          >
            {badge.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
