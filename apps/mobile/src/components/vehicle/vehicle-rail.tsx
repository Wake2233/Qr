import type { VehicleCard as Card } from '@cp/api';
import { FlashList } from '@shopify/flash-list';
import { Link, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import { cn } from '@/lib/cn';

import { VehicleCard } from './vehicle-card';

/** Horizontal rail of cards (Discover). */
export function VehicleRail({
  title,
  subtitle,
  cards,
  href,
}: {
  title: string;
  subtitle?: string;
  cards: Card[];
  href?: Href;
}) {
  if (cards.length === 0) return null;
  return (
    <View className="gap-3">
      <View className="flex-row items-end justify-between px-4">
        <View className="flex-1">
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
        </View>
        {href ? (
          <Link href={href} asChild>
            <Pressable accessibilityRole="link" hitSlop={8} className="min-h-11 justify-center">
              <Text className="font-sans-semibold text-sm text-primary">See all</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
      <FlashList
        horizontal
        data={cards}
        keyExtractor={(card) => card.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View className={cn('pl-3', index === 0 && 'pl-4', index === cards.length - 1 && 'pr-4')}>
            <VehicleCard card={item} className="w-72" />
          </View>
        )}
      />
    </View>
  );
}
