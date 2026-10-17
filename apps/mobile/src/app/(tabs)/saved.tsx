import { useVehiclesByIds } from '@cp/api';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { VehicleCard } from '@/components/vehicle/vehicle-card';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';
import { useFavorites } from '@/lib/use-favorites';
import { useCompareStore } from '@/stores/compare';
import { useRecentlyViewedStore } from '@/stores/recently-viewed';

const TABS = ['saved', 'recent'] as const;

export default function SavedScreen() {
  const t = useT();
  const [tab, setTab] = useState<(typeof TABS)[number]>('saved');
  const favorites = useFavorites();
  const recentIds = useRecentlyViewedStore((s) => s.ids);
  const compareIds = useCompareStore((s) => s.ids);
  const clearCompare = useCompareStore((s) => s.clear);
  const ids = tab === 'saved' ? favorites.ids : recentIds;
  const cards = useVehiclesByIds(supabase, ids);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-5 px-4 pb-12 pt-4">
        <Text variant="display" accessibilityRole="header">
          {t.saved.title}
        </Text>

        {compareIds.length > 0 ? (
          <View className="flex-row items-center gap-3 rounded-2xl bg-primary/10 p-4">
            <Text className="flex-1 font-sans-medium">{t.saved.inCompare(compareIds.length)}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={clearCompare}
              className="min-h-11 justify-center px-2"
            >
              <Text className="font-sans-medium text-sm text-muted-foreground">
                {t.common.clear}
              </Text>
            </Pressable>
            <Link href="/compare" asChild>
              <Button title={t.saved.compare} size="sm" />
            </Link>
          </View>
        ) : null}

        <View className="flex-row gap-2" accessibilityRole="tablist">
          {TABS.map((id) => (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === id }}
              onPress={() => setTab(id)}
              className={cn(
                'min-h-11 justify-center rounded-full px-4',
                tab === id ? 'bg-foreground' : 'bg-muted',
              )}
            >
              <Text
                className={cn(
                  'font-sans-medium text-sm',
                  tab === id ? 'text-background' : 'text-foreground',
                )}
              >
                {id === 'saved' ? t.saved.title : t.saved.recent}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'saved' && favorites.ready && !favorites.signedIn ? (
          <View className="flex-row items-center gap-3 rounded-2xl bg-muted p-4">
            <Text variant="caption" className="flex-1">
              {t.saved.deviceOnly}
            </Text>
            <Link href="/sign-in" asChild>
              <Button title={t.common.signIn} size="sm" variant="outline" />
            </Link>
          </View>
        ) : null}

        {ids.length > 0 && cards.isPending ? (
          <ActivityIndicator className="py-12" />
        ) : (cards.data ?? []).length === 0 ? (
          <View className="items-center gap-3 py-16">
            <Text variant="heading">
              {tab === 'saved' ? t.saved.emptySaved : t.saved.emptyRecent}
            </Text>
            <Text variant="caption" className="text-center">
              {tab === 'saved' ? t.saved.emptySavedBody : t.saved.emptyRecentBody}
            </Text>
            <Link href="/search" asChild>
              <Button title={t.common.browseInventory} />
            </Link>
          </View>
        ) : (
          (cards.data ?? []).map((card) => <VehicleCard key={card.id} card={card} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
