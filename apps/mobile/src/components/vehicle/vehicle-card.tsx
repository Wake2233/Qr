import { vehicleQueries, type VehicleCard as Card } from '@cp/api';
import {
  formatMileage,
  formatPrice,
  fuelTypeLabels,
  listingStatusLabels,
  priceDropCents,
  vehicleImageAlt,
} from '@cp/core';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { cn } from '@/lib/cn';
import { Image } from '@/lib/interop';
import { supabase } from '@/lib/supabase';
import { useFavorites } from '@/lib/use-favorites';

/** Inventory card. Press-in prefetches the VDP so it opens instantly. */
export function VehicleCard({ card, className }: { card: Card; className?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSaved, toggle } = useFavorites();
  const saved = isSaved(card.id);
  const drop = priceDropCents(card.previous_price_cents, card.price_cents);
  const live = card.status === 'active';
  const facts = [
    card.mileage === null ? null : formatMileage(card.mileage),
    card.fuel_type ? fuelTypeLabels[card.fuel_type] : null,
    card.drivetrain?.toUpperCase() ?? null,
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${card.title}, ${card.price_cents === null ? '' : formatPrice(card.price_cents)}`}
      onPressIn={() => void queryClient.prefetchQuery(vehicleQueries.detail(supabase, card.slug))}
      onPress={() => router.push({ pathname: '/vehicle/[slug]', params: { slug: card.slug } })}
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card active:opacity-90',
        className,
      )}
    >
      <View className="aspect-[4/3] w-full bg-muted">
        {card.cover_url ? (
          <Image
            source={{ uri: card.cover_url }}
            placeholder={card.cover_blurhash ? { blurhash: card.cover_blurhash } : undefined}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            accessibilityLabel={card.cover_alt ?? vehicleImageAlt(card.title, null, 0)}
            className="h-full w-full"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Icon name="car" size={36} tone="muted" />
          </View>
        )}
        <View className="absolute left-3 top-3 flex-row gap-1.5">
          {!live ? (
            <View
              className={cn(
                'rounded-full px-2.5 py-1',
                card.status === 'sold' ? 'bg-foreground' : 'bg-amber-400',
              )}
            >
              <Text
                className={cn(
                  'font-sans-semibold text-xs',
                  card.status === 'sold' ? 'text-background' : 'text-amber-950',
                )}
              >
                {listingStatusLabels[card.status]}
              </Text>
            </View>
          ) : null}
          {drop && live ? (
            <View className="rounded-full bg-emerald-600 px-2.5 py-1">
              <Text className="font-sans-semibold text-xs text-white">{formatPrice(drop)} off</Text>
            </View>
          ) : null}
        </View>
        {card.status !== 'sold' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? `Remove ${card.title} from saved` : `Save ${card.title}`}
            accessibilityState={{ selected: saved }}
            hitSlop={8}
            onPress={() => toggle(card.id)}
            className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-full bg-background/85"
          >
            <Icon name={saved ? 'heartFill' : 'heart'} tone={saved ? 'rose' : 'foreground'} />
          </Pressable>
        ) : null}
      </View>
      <View className="gap-1 p-4">
        <Text className="font-display text-lg text-foreground" numberOfLines={1}>
          {card.year} {card.make_name} {card.model_name}
        </Text>
        {card.trim ? (
          <Text variant="caption" numberOfLines={1}>
            {card.trim}
          </Text>
        ) : null}
        <View className="mt-1 flex-row items-baseline justify-between gap-3">
          {card.price_cents !== null ? (
            <Text className="font-display-bold text-2xl text-foreground">
              {formatPrice(card.price_cents)}
            </Text>
          ) : null}
          {drop && card.previous_price_cents !== null ? (
            <Text variant="caption" className="line-through">
              {formatPrice(card.previous_price_cents)}
            </Text>
          ) : null}
        </View>
        {facts.length > 0 ? (
          <Text variant="caption" numberOfLines={1}>
            {facts.join(' · ')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function VehicleCardSkeleton({ className }: { className?: string }) {
  return (
    <View
      className={cn('overflow-hidden rounded-2xl border border-border bg-card', className)}
      accessibilityElementsHidden
    >
      <View className="aspect-[4/3] w-full bg-muted" />
      <View className="gap-2 p-4">
        <View className="h-5 w-3/4 rounded bg-muted" />
        <View className="h-4 w-1/2 rounded bg-muted" />
        <View className="h-7 w-1/3 rounded bg-muted" />
      </View>
    </View>
  );
}
