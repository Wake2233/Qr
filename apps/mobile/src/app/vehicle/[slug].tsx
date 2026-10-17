import { recordVehicleView, useSiteSettings, useVehicle, vehicleQueries } from '@cp/api';
import { formatMileage, formatPrice, MAX_COMPARE, priceDropCents, vehicleContact } from '@cp/core';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { toast } from 'sonner-native';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { ConditionBadges } from '@/components/vehicle/condition-badges';
import { ContactBar } from '@/components/vehicle/contact-bar';
import { VehicleGallery } from '@/components/vehicle/vehicle-gallery';
import { VehicleRail } from '@/components/vehicle/vehicle-rail';
import { VehicleFeatures, VehicleSpecs } from '@/components/vehicle/vehicle-specs';
import { useCoreT, useLocale, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { shareVehicle, vehicleWebUrl } from '@/lib/share';
import { supabase } from '@/lib/supabase';
import { useFavorites } from '@/lib/use-favorites';
import { useCompareStore } from '@/stores/compare';
import { useRecentlyViewedStore } from '@/stores/recently-viewed';

export default function VehicleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useT();
  const d = useCoreT();
  const locale = useLocale();
  const vehicle = useVehicle(supabase, slug);
  const settings = useSiteSettings(supabase);
  const v = vehicle.data;
  const similar = useQuery({
    ...vehicleQueries.similar(supabase, {
      id: v?.id ?? '',
      makeId: v?.make.id ?? 0,
      bodyType: v?.body_type ?? null,
      priceCents: v?.price_cents ?? 0,
    }),
    enabled: Boolean(v && v.price_cents !== null),
  });
  const pushRecent = useRecentlyViewedStore((s) => s.push);
  const vehicleId = v?.id;
  useEffect(() => {
    if (!vehicleId) return;
    recordVehicleView(supabase, vehicleId);
    pushRecent(vehicleId);
  }, [vehicleId, pushRecent]);

  if (vehicle.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator />
      </View>
    );
  }
  if (!v) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
        <Stack.Screen options={{ title: t.vehicle.notFound }} />
        <Text variant="heading" className="text-center">
          {vehicle.isError ? t.vehicle.loadError : t.vehicle.noLongerListed}
        </Text>
        {vehicle.isError ? (
          <Button title={t.common.tryAgain} onPress={() => void vehicle.refetch()} />
        ) : (
          <Link href="/search" asChild>
            <Button title={t.common.browseInventory} />
          </Link>
        )}
      </View>
    );
  }

  const contact = settings.data
    ? vehicleContact({
        vehicle: v,
        dealer: v.dealer,
        settings: settings.data,
        url: vehicleWebUrl(slug, locale),
      })
    : null;
  const drop = priceDropCents(v.previous_price_cents, v.price_cents);
  const sold = v.status === 'sold';
  const facts = [
    v.mileage === null ? null : formatMileage(v.mileage, locale),
    v.exterior_color,
    v.stock_number ? t.vehicle.stock(v.stock_number) : null,
  ].filter(Boolean);
  const price = v.price_cents === null ? null : formatPrice(v.price_cents);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: `${v.year} ${v.make.name} ${v.model.name}`,
          headerRight: () => (
            <HeaderActions id={v.id} title={v.title} price={price} slug={slug} sold={sold} />
          ),
        }}
      />
      <ScrollView contentContainerClassName={sold ? 'pb-12' : 'pb-32'}>
        <VehicleGallery
          title={v.title}
          images={v.images.map((image) => ({
            id: image.id,
            url: image.url,
            blurhash: image.blurhash,
            alt: image.alt,
          }))}
        />
        <View className="gap-6 px-4 pt-5">
          <View className="gap-2">
            {v.status !== 'active' ? (
              <View
                className={cn(
                  'self-start rounded-full px-3 py-1',
                  sold ? 'bg-foreground' : 'bg-amber-400',
                )}
              >
                <Text
                  className={cn(
                    'font-sans-semibold text-xs',
                    sold ? 'text-background' : 'text-amber-950',
                  )}
                >
                  {d.listingStatus[v.status]}
                </Text>
              </View>
            ) : null}
            <Text variant="display" accessibilityRole="header">
              {v.year} {v.make.name} {v.model.name}
            </Text>
            {v.trim ? <Text variant="muted">{v.trim}</Text> : null}
            <View className="flex-row flex-wrap items-baseline gap-x-3">
              {price ? <Text className="font-display-bold text-4xl">{price}</Text> : null}
              {drop && v.previous_price_cents !== null ? (
                <Text variant="caption" className="line-through">
                  {formatPrice(v.previous_price_cents)}
                </Text>
              ) : null}
            </View>
            {drop ? (
              <View className="flex-row items-center gap-1 self-start rounded-full bg-emerald-600 px-2.5 py-1">
                <Icon name="priceDrop" size={12} tone="white" />
                <Text className="font-sans-semibold text-xs text-white">
                  {t.vehicle.priceDrop(formatPrice(drop))}
                </Text>
              </View>
            ) : null}
            {v.msrp_cents !== null ? (
              <Text variant="caption">{t.vehicle.msrp(formatPrice(v.msrp_cents))}</Text>
            ) : null}
            {facts.length > 0 ? <Text variant="caption">{facts.join(' · ')}</Text> : null}
            <ConditionBadges vehicle={v} />
          </View>

          {sold ? (
            <View className="gap-1 rounded-2xl bg-muted p-4">
              <Text variant="heading">{t.vehicle.soldTitle}</Text>
              <Text variant="caption">{t.vehicle.soldBody}</Text>
            </View>
          ) : null}

          <VehicleSpecs vehicle={{ ...v, make: v.make.name, model: v.model.name }} />
          <VehicleFeatures features={v.features} />

          {v.description ? (
            <View className="gap-2">
              <Text variant="title" accessibilityRole="header">
                {t.vehicle.about}
              </Text>
              <Text variant="muted" className="leading-6">
                {v.description}
              </Text>
            </View>
          ) : null}

          {v.dealer ? (
            <View className="gap-2 rounded-2xl border border-border p-4">
              <Text variant="caption">
                {v.dealer.is_house ? t.vehicle.soldBy : t.vehicle.listedBy}
              </Text>
              <Text variant="heading">{v.dealer.display_name}</Text>
              {v.dealer.address_line1 ? (
                <Text variant="caption">
                  {[v.dealer.address_line1, v.dealer.city, v.dealer.state]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              ) : null}
              <Link href={{ pathname: '/search', params: { dealer: v.dealer.slug } }} asChild>
                <Pressable accessibilityRole="link" className="min-h-11 justify-center">
                  <Text className="font-sans-semibold text-sm text-primary">
                    {t.vehicle.dealerVehicles}
                  </Text>
                </Pressable>
              </Link>
            </View>
          ) : null}
        </View>
        <View className="pt-8">
          <VehicleRail
            title={t.vehicle.similar}
            subtitle={t.vehicle.similarSubtitle}
            cards={similar.data ?? []}
          />
        </View>
      </ScrollView>

      {!sold && contact ? (
        <ContactBar
          vehicleId={v.id}
          priceCents={v.price_cents}
          whatsappE164={contact.whatsappE164}
          phoneE164={contact.phoneE164}
          text={contact.text}
        />
      ) : null}
    </View>
  );
}

function HeaderActions({
  id,
  title,
  price,
  slug,
  sold,
}: {
  id: string;
  title: string;
  price: string | null;
  slug: string;
  sold: boolean;
}) {
  const { isSaved, toggle } = useFavorites();
  const inCompare = useCompareStore((s) => s.ids.includes(id));
  const add = useCompareStore((s) => s.add);
  const remove = useCompareStore((s) => s.remove);
  const saved = isSaved(id);
  const t = useT();
  const locale = useLocale();

  return (
    <View className="flex-row items-center">
      {!sold ? (
        <>
          <HeaderButton
            icon={saved ? 'heartFill' : 'heart'}
            tone={saved ? 'rose' : 'foreground'}
            label={saved ? t.vehicle.unsave : t.vehicle.save}
            selected={saved}
            onPress={() => toggle(id)}
          />
          <HeaderButton
            icon="compare"
            tone={inCompare ? 'primary' : 'foreground'}
            label={inCompare ? t.vehicle.compareRemove : t.vehicle.compareAdd}
            selected={inCompare}
            onPress={() => {
              void Haptics.selectionAsync();
              if (inCompare) return remove(id);
              if (add(id) === 'full') toast.error(t.vehicle.compareFull(MAX_COMPARE));
              else toast.success(t.vehicle.compareAdded);
            }}
          />
        </>
      ) : null}
      <HeaderButton
        icon="share"
        label={t.vehicle.share}
        onPress={() => void shareVehicle({ title, price, slug, locale }).catch(() => undefined)}
      />
    </View>
  );
}

function HeaderButton({
  icon,
  tone = 'foreground',
  label,
  selected,
  onPress,
}: {
  icon: IconName;
  tone?: 'foreground' | 'primary' | 'rose';
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      hitSlop={4}
      className="h-11 w-11 items-center justify-center"
    >
      <Icon name={icon} tone={tone} />
    </Pressable>
  );
}
