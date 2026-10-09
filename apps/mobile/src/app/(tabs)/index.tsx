import { useFacets, useSiteSettings, vehicleQueries } from '@cp/api';
import { bodyTypeLabels } from '@cp/core';
import type { Enums } from '@cp/types';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { VehicleRail } from '@/components/vehicle/vehicle-rail';
import { supabase } from '@/lib/supabase';

const BODY_ORDER: Enums<'body_type'>[] = [
  'suv',
  'sedan',
  'pickup',
  'coupe',
  'hatchback',
  'convertible',
  'wagon',
  'minivan',
  'van',
];

export default function DiscoverScreen() {
  const facets = useFacets(supabase, {});
  const settings = useSiteSettings(supabase);
  const featured = useQuery(vehicleQueries.featured(supabase));
  const drops = useQuery(vehicleQueries.priceDrops(supabase));
  const sold = useQuery(vehicleQueries.recentlySold(supabase));
  const bodies = new Map((facets.data?.body ?? []).map((b) => [b.value, b.count]));
  const tiles = BODY_ORDER.filter((type) => (bodies.get(type) ?? 0) > 0);
  const refreshing = facets.isRefetching || featured.isRefetching;
  const networkSize = settings.data?.lender_network_size ?? 0;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-8 pb-12 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void facets.refetch();
              void featured.refetch();
              void drops.refetch();
              void sold.refetch();
            }}
          />
        }
      >
        <View className="gap-4 px-4">
          <Text className="font-sans-medium text-sm uppercase tracking-widest text-primary">
            {facets.data
              ? `${facets.data.total} vehicles in stock`
              : (settings.data?.brand_name ?? ' ')}
          </Text>
          <Text className="font-display-bold text-4xl leading-tight text-foreground">
            Find the car you&apos;ll love driving.
          </Text>
          <Text variant="muted">
            Exact prices and full specs on every listing. Found the one? Message us on WhatsApp or
            call.
          </Text>
          <Link href="/search" asChild>
            <Pressable
              accessibilityRole="search"
              accessibilityLabel="Search inventory"
              className="h-12 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3"
            >
              <Icon name="search" size={18} tone="muted" />
              <Text variant="muted">Search make, model, trim…</Text>
            </Pressable>
          </Link>
          {facets.isError ? (
            <Text variant="caption">Inventory is unavailable right now. Pull to retry.</Text>
          ) : null}
        </View>

        {tiles.length > 0 ? (
          <View className="gap-3 px-4">
            <Text variant="title" accessibilityRole="header">
              Shop by body style
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {tiles.map((type) => (
                <Link key={type} href={{ pathname: '/search', params: { body: type } }} asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`${bodyTypeLabels[type]}, ${bodies.get(type)} in stock`}
                    className="min-w-[46%] flex-1 gap-4 rounded-2xl border border-border bg-card p-4 active:opacity-80"
                  >
                    <Text className="font-display text-lg">{bodyTypeLabels[type]}</Text>
                    <Text variant="caption">{bodies.get(type)} in stock</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        ) : null}

        <VehicleRail title="Featured" cards={featured.data ?? []} href="/search" />
        <VehicleRail title="Price drops" subtitle="Recently reduced." cards={drops.data ?? []} />
        <VehicleRail
          title="Recently sold"
          subtitle="Sold in the last 30 days. Ask us for something similar."
          cards={sold.data ?? []}
        />

        <View className="mx-4 gap-3 rounded-3xl border border-border bg-card p-5">
          <Text variant="title">Know your payment before you visit</Text>
          <Text variant="muted">
            Estimate a monthly payment on any car
            {networkSize > 0
              ? `, then pre-qualify across our ${networkSize.toLocaleString('en-US')}+ lender network`
              : ''}
            .
          </Text>
          <Text variant="caption" className="text-xs">
            Offers are simulated pre-qualification estimates, not credit decisions.
          </Text>
          <Link href="/finance" asChild>
            <Button title="Explore financing" variant="outline" />
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
