import { useFacets, useInfiniteVehicles } from '@cp/api';
import {
  activeFilterChips,
  clearFilters,
  countActiveFilters,
  SORT_OPTIONS,
  sortLabels,
  type InventoryFilters,
} from '@cp/core';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ActionSheet } from '@/components/console/action-sheet';
import { Icon } from '@/components/icon';
import { FilterSheet } from '@/components/inventory/filter-sheet';
import { Text } from '@/components/text';
import { VehicleCard, VehicleCardSkeleton } from '@/components/vehicle/vehicle-card';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/theme';
import { useInventoryFilters } from '@/lib/use-inventory-filters';

const SEARCH_DEBOUNCE_MS = 350;

export default function SearchScreen() {
  const { filters, setFilters } = useInventoryFilters();
  const listFilters = useMemo(() => withoutPage(filters), [filters]);
  const facetFilters = useMemo(() => withoutSort(listFilters), [listFilters]);
  const vehicles = useInfiniteVehicles(supabase, listFilters);
  const facets = useFacets(supabase, facetFilters);
  const sheet = useRef<BottomSheetModal>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 2 : 1;

  const cards = useMemo(() => vehicles.data?.pages.flatMap((p) => p.items) ?? [], [vehicles.data]);
  const total = facets.data?.total ?? vehicles.data?.pages[0]?.total;
  const labels = useMemo(() => {
    const toMap = (items: { value: string; label: string }[] = []) =>
      Object.fromEntries(items.map((i) => [i.value, i.label]));
    return {
      make: toMap(facets.data?.make),
      model: toMap(facets.data?.model),
      feature: toMap(facets.data?.feature),
    };
  }, [facets.data]);
  const chips = activeFilterChips(filters, labels);
  const activeCount = countActiveFilters(filters);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="gap-3 px-4 pb-2 pt-2">
        <SearchField
          value={filters.q ?? ''}
          onChange={(q) => setFilters({ ...listFilters, q: q || undefined })}
        />
        <View className="flex-row items-center gap-2">
          <ToolbarButton
            icon="filters"
            label={activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
            onPress={() => sheet.current?.present()}
          />
          <ToolbarButton
            icon="sort"
            label={sortLabels[filters.sort ?? 'newest']}
            onPress={() => setSortOpen(true)}
          />
          <Text variant="caption" className="ml-auto" accessibilityLiveRegion="polite">
            {total === undefined ? '' : `${total} ${total === 1 ? 'vehicle' : 'vehicles'}`}
          </Text>
        </View>
        {chips.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {chips.map((chip) => (
              <Pressable
                key={chip.id}
                accessibilityRole="button"
                accessibilityLabel={`Remove filter: ${chip.label}`}
                onPress={() => setFilters(chip.next)}
                className="min-h-9 flex-row items-center gap-1 rounded-full bg-muted px-3"
              >
                <Text className="font-sans-medium text-sm">{chip.label}</Text>
                <Icon name="close" size={12} tone="muted" />
              </Pressable>
            ))}
            {chips.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setFilters(clearFilters(filters))}
                className="min-h-9 justify-center px-2"
              >
                <Text className="font-sans-semibold text-sm text-primary">Clear all</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        ) : null}
      </View>

      {vehicles.isPending ? (
        <View className="gap-4 px-4 pt-2">
          <VehicleCardSkeleton />
          <VehicleCardSkeleton />
        </View>
      ) : vehicles.isError ? (
        <EmptyState
          title="We couldn’t load the inventory"
          body="Check your connection and try again."
          action={<Button title="Try again" onPress={() => void vehicles.refetch()} />}
        />
      ) : (
        <FlashList
          key={columns}
          data={cards}
          numColumns={columns}
          keyExtractor={(card) => card.id}
          renderItem={({ item, index }) => (
            <View
              className={
                columns === 2
                  ? index % 2 === 0
                    ? 'pb-4 pl-4 pr-2'
                    : 'pb-4 pl-2 pr-4'
                  : 'px-4 pb-4'
              }
            >
              <VehicleCard card={item} />
            </View>
          )}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (vehicles.hasNextPage && !vehicles.isFetchingNextPage) void vehicles.fetchNextPage();
          }}
          refreshControl={
            <RefreshControl
              refreshing={vehicles.isRefetching && !vehicles.isFetchingNextPage}
              onRefresh={() => {
                void vehicles.refetch();
                void facets.refetch();
              }}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No vehicles match"
              body="Try removing a filter or widening the price and year range."
              action={
                activeCount > 0 ? (
                  <Button title="Clear filters" onPress={() => setFilters(clearFilters(filters))} />
                ) : null
              }
            />
          }
          ListFooterComponent={
            vehicles.isFetchingNextPage ? (
              <ActivityIndicator className="py-6" />
            ) : cards.length > 0 && !vehicles.hasNextPage ? (
              <Text variant="caption" className="py-6 text-center">
                You’ve seen all {cards.length} {cards.length === 1 ? 'vehicle' : 'vehicles'}.
              </Text>
            ) : null
          }
        />
      )}

      <FilterSheet ref={sheet} filters={filters} facets={facets.data} onChange={setFilters} />
      <ActionSheet
        visible={sortOpen}
        title="Sort by"
        onClose={() => setSortOpen(false)}
        actions={SORT_OPTIONS.map((sort) => ({
          label: `${sort === (filters.sort ?? 'newest') ? '✓ ' : ''}${sortLabels[sort]}`,
          onPress: () => {
            setSortOpen(false);
            setFilters({ ...listFilters, sort });
          },
        }))}
      />
    </SafeAreaView>
  );
}

function withoutPage(filters: InventoryFilters): InventoryFilters {
  const { page: _page, ...rest } = filters;
  return rest;
}

function withoutSort(filters: InventoryFilters): InventoryFilters {
  const { sort: _sort, ...rest } = filters;
  return rest;
}

function SearchField({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const { native } = useAppTheme();
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (draft.trim() === value) return;
    const timer = setTimeout(() => onChangeRef.current(draft.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, value]);

  return (
    <View className="h-12 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
      <Icon name="search" size={18} tone="muted" />
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Search make, model, trim…"
        accessibilityLabel="Search inventory"
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onSubmitEditing={() => onChange(draft.trim())}
        className="flex-1 font-sans text-base text-foreground"
        placeholderTextColor={native.muted}
      />
    </View>
  );
}

function ToolbarButton({
  icon,
  label,
  onPress,
}: {
  icon: 'filters' | 'sort';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-11 flex-row items-center gap-2 rounded-full border border-border px-4 active:opacity-80"
    >
      <Icon name={icon} size={16} />
      <Text className="font-sans-medium text-sm" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="items-center gap-3 px-8 py-16">
      <Text variant="heading" className="text-center">
        {title}
      </Text>
      <Text variant="caption" className="text-center">
        {body}
      </Text>
      {action}
    </View>
  );
}
