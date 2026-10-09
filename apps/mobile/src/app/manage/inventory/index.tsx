import {
  useConsoleVehicles,
  useSetVehicleStatus,
  useUpdateVehiclePrice,
  type ConsoleVehicle,
  type InventoryScope,
} from '@cp/api';
import {
  formatMileage,
  formatPrice,
  isAdmin as isAdminRole,
  listingStatusActions,
  listingStatusLabels,
  parseDbError,
} from '@cp/core';
import { Constants, type Enums } from '@cp/types';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Link, Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { toast } from 'sonner-native';

import { ActionSheet } from '@/components/console/action-sheet';
import { PriceSheet } from '@/components/console/price-sheet';
import { FilterChip, ListingStatusChip } from '@/components/console/status-chip';
import { Text } from '@/components/text';
import { Image } from '@/lib/interop';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

type Status = Enums<'listing_status'>;

export default function InventoryScreen() {
  const router = useRouter();
  const { context } = useSession();
  const admin = context ? isAdminRole({ role: context.profile.role }) : false;
  const scope: InventoryScope = useMemo(
    () =>
      admin
        ? { kind: 'all' }
        : { kind: 'dealers', dealerIds: context?.memberships.map((m) => m.dealerId) ?? [] },
    [admin, context],
  );
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status | undefined>();
  const list = useConsoleVehicles(supabase, scope, { q: search || undefined, status });
  const setStatusMutation = useSetVehicleStatus(supabase);
  const priceMutation = useUpdateVehiclePrice(supabase);
  const [statusFor, setStatusFor] = useState<ConsoleVehicle | null>(null);
  const [priceFor, setPriceFor] = useState<ConsoleVehicle | null>(null);

  const changeStatus = (vehicle: ConsoleVehicle, to: Status, label: string) =>
    setStatusMutation.mutate(
      { id: vehicle.id, status: to },
      {
        onSuccess: (result) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          toast.success(result === 'pending_review' ? 'Submitted for review' : `${label}: done`);
        },
        onError: (error) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          const parsed = parseDbError(error);
          toast.error(parsed.message);
          if (parsed.code === 'MISSING_FIELDS' || parsed.code === 'MISSING_IMAGES') {
            router.push({ pathname: '/manage/inventory/[id]', params: { id: vehicle.id } });
          }
        },
      },
    );

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: 'Inventory',
          headerRight: () => (
            <Link href="/manage/inventory/new" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add vehicle"
                hitSlop={12}
                className="px-2"
              >
                <Text className="font-sans-semibold text-primary">+ Add</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <View className="gap-3 px-4 pt-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => setSearch(q.trim())}
          onEndEditing={() => setSearch(q.trim())}
          returnKeyType="search"
          placeholder="Search make, model, VIN or stock #"
          placeholderTextColor="#71717a"
          accessibilityLabel="Search inventory"
          autoCorrect={false}
          className="h-11 rounded-md border border-input px-3 font-sans text-base text-foreground"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pb-2"
        >
          <FilterChip label="All" selected={!status} onPress={() => setStatus(undefined)} />
          {Constants.public.Enums.listing_status.map((s) => (
            <FilterChip
              key={s}
              label={listingStatusLabels[s]}
              selected={status === s}
              onPress={() => setStatus(s)}
            />
          ))}
        </ScrollView>
      </View>

      {list.isPending ? (
        <ActivityIndicator className="mt-10" />
      ) : list.isError ? (
        <Text variant="muted" className="px-4 pt-6">
          Couldn&apos;t load inventory. Pull to retry.
        </Text>
      ) : (
        <FlashList
          data={list.data.items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} />
          }
          ListEmptyComponent={
            <View className="items-center gap-2 px-6 py-16">
              <Text variant="heading">
                {search || status ? 'No listings match' : 'No listings yet'}
              </Text>
              <Text variant="caption" className="text-center">
                {search || status
                  ? 'Try a different search or filter.'
                  : 'Tap “+ Add” to create your first draft.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            list.data.total > list.data.items.length ? (
              <Text variant="caption" className="px-4 py-4 text-center">
                Showing {list.data.items.length} of {list.data.total}. Search to narrow down.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <ReanimatedSwipeable
              friction={2}
              rightThreshold={40}
              overshootRight={false}
              renderRightActions={(_progress, _translation, methods) => (
                <View className="flex-row">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit price of ${item.title}`}
                    onPress={() => {
                      methods.close();
                      setPriceFor(item);
                    }}
                    className="w-24 items-center justify-center bg-primary"
                  >
                    <Text className="font-sans-semibold text-primary-foreground">Price</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Change status of ${item.title}`}
                    onPress={() => {
                      methods.close();
                      setStatusFor(item);
                    }}
                    className="w-24 items-center justify-center bg-foreground"
                  >
                    <Text className="font-sans-semibold text-background">Status</Text>
                  </Pressable>
                </View>
              )}
            >
              <Link href={{ pathname: '/manage/inventory/[id]', params: { id: item.id } }} asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint="Swipe left for price and status actions"
                  onLongPress={() => setStatusFor(item)}
                  className="flex-row gap-3 border-b border-border bg-background px-4 py-3 active:bg-muted"
                >
                  <View className="h-16 w-20 overflow-hidden rounded-md bg-muted">
                    {item.cover_url ? (
                      <Image
                        source={item.cover_url}
                        placeholder={
                          item.cover_blurhash ? { blurhash: item.cover_blurhash } : undefined
                        }
                        cachePolicy="memory-disk"
                        contentFit="cover"
                        className="h-16 w-20"
                        accessibilityLabel={item.cover_alt ?? item.title}
                      />
                    ) : null}
                  </View>
                  <View className="flex-1 gap-1">
                    <Text variant="heading" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text variant="caption" numberOfLines={1}>
                      {[
                        item.price_cents ? formatPrice(item.price_cents) : 'No price',
                        item.mileage != null ? formatMileage(item.mileage) : null,
                        item.stock_number ? `#${item.stock_number}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <ListingStatusChip status={item.status} />
                      <Text variant="caption">
                        {item.image_count ?? 0} photo{item.image_count === 1 ? '' : 's'}
                        {admin || (context?.memberships.length ?? 0) > 1
                          ? ` · ${item.dealer_name ?? ''}`
                          : ''}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </Link>
            </ReanimatedSwipeable>
          )}
        />
      )}

      <ActionSheet
        visible={statusFor !== null}
        title={statusFor ? `${statusFor.title} · ${listingStatusLabels[statusFor.status]}` : ''}
        onClose={() => setStatusFor(null)}
        actions={
          statusFor
            ? listingStatusActions(statusFor.status, { isAdmin: admin }).map((action) => ({
                label: action.label,
                disabled: action.publishes && statusFor.dealer_status !== 'approved',
                hint:
                  action.publishes && statusFor.dealer_status !== 'approved'
                    ? 'Dealer not approved yet'
                    : undefined,
                destructive: action.to === 'archived',
                onPress: () => changeStatus(statusFor, action.to, action.label),
              }))
            : []
        }
      />
      <PriceSheet
        visible={priceFor !== null}
        title={priceFor?.title ?? ''}
        priceCents={priceFor?.price_cents ?? null}
        saving={priceMutation.isPending}
        onClose={() => setPriceFor(null)}
        onSave={(cents) =>
          priceFor &&
          priceMutation.mutate(
            { id: priceFor.id, priceCents: cents },
            {
              onSuccess: () => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                toast.success(`Price updated to ${formatPrice(cents)}`);
                setPriceFor(null);
              },
              onError: (error) => toast.error(parseDbError(error).message),
            },
          )
        }
      />
    </View>
  );
}
