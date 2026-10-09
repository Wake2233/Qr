import { useCompareVehicles, useSiteSettings } from '@cp/api';
import {
  buildCompareSections,
  FEATURE_INCLUDED,
  formatPrice,
  MAX_COMPARE,
  onlyDifferences,
  vehicleContact,
  vehicleImageAlt,
} from '@cp/core';
import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { cn } from '@/lib/cn';
import { contactAbout } from '@/lib/contact';
import { Image } from '@/lib/interop';
import { vehicleWebUrl } from '@/lib/share';
import { supabase } from '@/lib/supabase';
import { useCompareStore } from '@/stores/compare';

const LABEL_COL = 'w-32';
const VALUE_COL = 'w-44';

/** Side-by-side compare (horizontal scroll), rows that differ highlighted. */
export default function CompareScreen() {
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const vehicles = useCompareVehicles(supabase, ids);
  const settings = useSiteSettings(supabase);
  const [hideIdentical, setHideIdentical] = useState(false);

  const columns = (vehicles.data ?? []).map((v) => ({
    ...v,
    make: v.make.name,
    model: v.model.name,
  }));
  const all = buildCompareSections(columns);
  const sections = hideIdentical ? onlyDifferences(all) : all;

  if (ids.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
        <Stack.Screen options={{ title: 'Compare' }} />
        <Icon name="compare" size={36} tone="primary" />
        <Text variant="heading">Nothing to compare yet</Text>
        <Text variant="caption" className="text-center">
          Open a vehicle and tap the compare icon. Up to {MAX_COMPARE} line up here side by side.
        </Text>
        <Link href="/search" asChild>
          <Button title="Browse inventory" />
        </Link>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: `Compare (${ids.length})` }} />
      <View className="flex-row items-center justify-end gap-2 px-4 py-2">
        <Text variant="label">Hide identical rows</Text>
        <Switch
          value={hideIdentical}
          onValueChange={setHideIdentical}
          accessibilityLabel="Hide identical rows"
        />
      </View>
      {vehicles.isPending ? (
        <ActivityIndicator className="py-12" />
      ) : (
        <ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="pb-12">
              <View className="flex-row border-b border-border">
                <View className={LABEL_COL} />
                {columns.map((v) => {
                  const contact = settings.data
                    ? vehicleContact({
                        vehicle: v,
                        dealer: v.dealer,
                        settings: settings.data,
                        url: vehicleWebUrl(v.slug ?? ''),
                      })
                    : null;
                  const cover = v.images[0];
                  return (
                    <View key={v.id} className={cn(VALUE_COL, 'gap-2 p-2')}>
                      <View className="aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                        {cover ? (
                          <Image
                            source={{ uri: cover.url }}
                            placeholder={cover.blurhash ? { blurhash: cover.blurhash } : undefined}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            accessibilityLabel={cover.alt ?? vehicleImageAlt(v.title, null, 0)}
                            className="h-full w-full"
                          />
                        ) : null}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${v.title} from compare`}
                          onPress={() => remove(v.id)}
                          className="absolute right-1 top-1 h-9 w-9 items-center justify-center rounded-full bg-background/85"
                        >
                          <Icon name="close" size={14} />
                        </Pressable>
                      </View>
                      <Link
                        href={{ pathname: '/vehicle/[slug]', params: { slug: v.slug ?? '' } }}
                        asChild
                      >
                        <Pressable accessibilityRole="link">
                          <Text className="font-sans-semibold text-sm" numberOfLines={2}>
                            {v.title}
                          </Text>
                        </Pressable>
                      </Link>
                      {v.price_cents !== null ? (
                        <Text className="font-display-bold text-lg">
                          {formatPrice(v.price_cents)}
                        </Text>
                      ) : null}
                      {contact?.whatsappE164 && v.status !== 'sold' ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`WhatsApp about the ${v.title}`}
                          onPress={() =>
                            void contactAbout(
                              v.id,
                              'whatsapp',
                              contact.whatsappE164 ?? '',
                              contact.text,
                            ).catch(() => undefined)
                          }
                          className="h-11 flex-row items-center justify-center gap-1.5 rounded-lg bg-whatsapp"
                        >
                          <Icon name="whatsapp" size={14} tone="onWhatsapp" />
                          <Text className="font-sans-semibold text-sm text-whatsapp-foreground">
                            WhatsApp
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {sections.map((section) => (
                <View key={section.id}>
                  <View className="bg-muted/60 px-3 py-2">
                    <Text className="font-sans-semibold text-xs uppercase tracking-wider">
                      {section.title}
                    </Text>
                  </View>
                  {section.rows.map((row) => (
                    <View
                      key={row.key}
                      className={cn(
                        'flex-row border-t border-border',
                        row.differs && 'bg-primary/5',
                      )}
                    >
                      <Text variant="caption" className={cn(LABEL_COL, 'px-3 py-2.5')}>
                        {row.label}
                      </Text>
                      {row.values.map((value, i) => (
                        <View
                          key={columns[i]?.id ?? i}
                          accessible
                          accessibilityLabel={`${columns[i]?.title ?? ''}: ${
                            value === null
                              ? 'not listed'
                              : value === FEATURE_INCLUDED
                                ? 'included'
                                : value
                          }`}
                          className={cn(VALUE_COL, 'justify-center px-3 py-2.5')}
                        >
                          {value === null ? (
                            <Icon name="dash" size={14} tone="muted" />
                          ) : value === FEATURE_INCLUDED ? (
                            <Icon name="check" size={16} tone="primary" />
                          ) : (
                            <Text className={cn('text-sm', row.differs && 'font-sans-semibold')}>
                              {value}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}
