import { useAdminDealers } from '@cp/api';
import { Constants, type Enums } from '@cp/types';
import { FlashList } from '@shopify/flash-list';
import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { DealerStatusChip, FilterChip } from '@/components/console/status-chip';
import { Text } from '@/components/text';
import { supabase } from '@/lib/supabase';

export default function DealersScreen() {
  const [status, setStatus] = useState<Enums<'dealer_status'> | undefined>('pending');
  const dealers = useAdminDealers(supabase, { status });

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Dealers' }} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="grow-0"
        contentContainerClassName="gap-2 px-4 py-3"
      >
        <FilterChip label="All" selected={!status} onPress={() => setStatus(undefined)} />
        {Constants.public.Enums.dealer_status.map((s) => (
          <FilterChip
            key={s}
            label={s[0]?.toUpperCase() + s.slice(1)}
            selected={status === s}
            onPress={() => setStatus(s)}
          />
        ))}
      </ScrollView>
      {dealers.isPending ? (
        <ActivityIndicator className="mt-10" />
      ) : (
        <FlashList
          data={dealers.data ?? []}
          keyExtractor={(d) => d.id}
          refreshControl={
            <RefreshControl
              refreshing={dealers.isRefetching}
              onRefresh={() => void dealers.refetch()}
            />
          }
          ListEmptyComponent={
            <Text variant="muted" className="px-4 py-10 text-center">
              No dealers {status ? `with status “${status}”` : 'yet'}.
            </Text>
          }
          renderItem={({ item }) => (
            <Link href={{ pathname: '/manage/dealers/[id]', params: { id: item.id } }} asChild>
              <Pressable
                accessibilityRole="button"
                className="gap-1 border-b border-border px-4 py-3 active:bg-muted"
              >
                <View className="flex-row items-center justify-between gap-3">
                  <Text variant="heading" className="flex-1" numberOfLines={1}>
                    {item.display_name}
                  </Text>
                  <DealerStatusChip status={item.status} />
                </View>
                <Text variant="caption">
                  {[
                    item.is_house ? 'House dealership' : item.email,
                    [item.city, item.state].filter(Boolean).join(', '),
                    `${item.vehicle_count} listings`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}
