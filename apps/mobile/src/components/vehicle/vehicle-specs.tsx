import { groupFeatures, groupVehicleSpecs, type VehicleSpecSource } from '@cp/core';
import type { Tables } from '@cp/types';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';

/** Every non-null spec, grouped Overview / Powertrain / Body & Interior / History. */
export function VehicleSpecs({ vehicle }: { vehicle: VehicleSpecSource }) {
  return (
    <View className="gap-4">
      {groupVehicleSpecs(vehicle).map((group) => (
        <View key={group.id} className="rounded-2xl border border-border p-4">
          <Text variant="heading" accessibilityRole="header" className="mb-2">
            {group.title}
          </Text>
          {group.rows.map((row, i) => (
            <View
              key={row.key}
              accessible
              accessibilityLabel={`${row.label}: ${row.value}`}
              className={`flex-row justify-between gap-4 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <Text variant="caption">{row.label}</Text>
              <Text
                className="flex-1 text-right font-sans-medium text-sm text-foreground"
                selectable={row.key === 'vin' || row.key === 'stock_number'}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function VehicleFeatures({
  features,
}: {
  features: Pick<Tables<'features'>, 'name' | 'category'>[];
}) {
  const groups = groupFeatures(features);
  if (groups.length === 0) return null;
  return (
    <View className="gap-4">
      <Text variant="title" accessibilityRole="header">
        Features
      </Text>
      {groups.map((group) => (
        <View key={group.category} className="gap-2">
          <Text className="font-sans-semibold text-xs uppercase tracking-wider text-muted-foreground">
            {group.title}
          </Text>
          {group.features.map((name) => (
            <View key={name} className="flex-row items-center gap-2">
              <Icon name="check" size={14} tone="primary" />
              <Text className="text-sm">{name}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
