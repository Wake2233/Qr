import type { InventoryFacets } from '@cp/api';
import {
  clearFilters,
  countActiveFilters,
  ENGINE_STEPS_L,
  FEATURE_CATEGORY_ORDER,
  featureName,
  formatMileage,
  formatPrice,
  MILEAGE_STEPS,
  PRICE_STEPS_CENTS,
  toggleFilterValue,
  type FilterListKey,
  type InventoryFilters,
} from '@cp/core';
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetBackgroundProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Text } from '@/components/text';
import { useCoreT, useLocale, useT } from '@/i18n';

interface Option {
  value: string;
  label: string;
  count: number;
}

interface FilterSheetProps {
  filters: InventoryFilters;
  facets: InventoryFacets | undefined;
  onChange: (next: InventoryFilters) => void;
}

const SNAP_POINTS = ['90%'];

/** Filters bottom sheet: live counts, same facets as the web rail. */
export const FilterSheet = forwardRef<BottomSheetModal, FilterSheetProps>(function FilterSheet(
  { filters, facets, onChange },
  ref,
) {
  const t = useT();
  const f = t.filters;
  const d = useCoreT();
  const locale = useLocale();
  const toggle = (key: FilterListKey, value: string) =>
    onChange(toggleFilterValue(filters, key, value as never));
  const set = (patch: Partial<InventoryFilters>) => {
    const { page: _page, ...rest } = filters;
    const next: InventoryFilters = { ...rest, ...patch };
    for (const key of Object.keys(patch) as (keyof InventoryFilters)[]) {
      if (next[key] === undefined) delete next[key];
    }
    onChange(next);
  };
  const close = useCallback(() => {
    if (ref && typeof ref === 'object') ref.current?.dismiss();
  }, [ref]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );
  const total = facets?.total;
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <SafeAreaView edges={['bottom']} className="border-t border-border bg-card">
          <View className="flex-row gap-3 px-4 py-3">
            <Button
              title={t.common.clear}
              variant="outline"
              className="flex-1"
              disabled={countActiveFilters(filters) === 0}
              onPress={() => onChange(clearFilters(filters))}
            />
            <Button
              title={total === undefined ? f.showResults : f.showCount(total)}
              className="flex-[2]"
              onPress={close}
            />
          </View>
        </SafeAreaView>
      </BottomSheetFooter>
    ),
    [filters, total, onChange, close, f, t.common.clear],
  );

  const enumOptions = (
    buckets: { value: string; count: number }[] | undefined,
    labels: Record<string, string>,
    selected: readonly string[] = [],
  ): Option[] =>
    withSelected(
      (buckets ?? []).map((b) => ({
        value: b.value,
        label: labels[b.value] ?? b.value,
        count: b.count,
      })),
      selected,
      (v) => labels[v] ?? v,
    );

  const models = (facets?.model ?? []).filter(
    (m) => !filters.make?.length || filters.make.includes(m.make),
  );
  // Before anything is listed the range is unknown: offer the last 25 model years.
  const thisYear = new Date().getFullYear();
  const years = rangeOf(facets?.year.min ?? thisYear - 25, facets?.year.max ?? thisYear + 1);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      backgroundComponent={SheetBackground}
      handleComponent={SheetHandle}
      accessibilityLabel={t.search.filters}
    >
      <BottomSheetScrollView>
        <View className="gap-6 px-4 pb-32">
          <Text variant="title" accessibilityRole="header">
            {t.search.filters}
          </Text>
          <Section title={f.make}>
            <ChipList
              options={inStockFirst(
                withSelected(
                  (facets?.make ?? []).map((m) => ({
                    value: m.value,
                    label: m.label,
                    count: m.count,
                  })),
                  filters.make,
                ),
                filters.make,
              )}
              selected={filters.make}
              onToggle={(v) => toggle('make', v)}
              initialVisible={12}
            />
          </Section>
          {filters.make?.length ? (
            <Section title={f.model}>
              <ChipList
                options={inStockFirst(
                  withSelected(
                    models.map((m) => ({ value: m.value, label: m.label, count: m.count })),
                    filters.model,
                  ),
                  filters.model,
                )}
                selected={filters.model}
                onToggle={(v) => toggle('model', v)}
              />
            </Section>
          ) : null}
          <Section title={f.maxPrice}>
            <StepChips
              steps={PRICE_STEPS_CENTS}
              value={filters.priceMaxCents}
              label={(c) => f.upTo(formatPrice(c))}
              onChange={(priceMaxCents) => set({ priceMaxCents })}
            />
          </Section>
          <Section title={f.minPrice}>
            <StepChips
              steps={PRICE_STEPS_CENTS}
              value={filters.priceMinCents}
              label={(c) => f.from(formatPrice(c))}
              onChange={(priceMinCents) => set({ priceMinCents })}
            />
          </Section>
          {years.length > 0 ? (
            <Section title={f.yearMin}>
              <StepChips
                steps={years}
                value={filters.yearMin}
                label={String}
                onChange={(yearMin) => set({ yearMin })}
              />
            </Section>
          ) : null}
          <Section title={f.mileage}>
            <StepChips
              steps={MILEAGE_STEPS}
              value={filters.mileageMax}
              label={(m) => d.chip.mileageUnder(formatMileage(m, locale))}
              onChange={(mileageMax) => set({ mileageMax })}
            />
          </Section>
          <Section title={f.bodyStyle}>
            <ChipList
              options={enumOptions(facets?.body, d.bodyType, filters.body)}
              selected={filters.body}
              onToggle={(v) => toggle('body', v)}
            />
          </Section>
          <Section title={f.condition}>
            <ChipList
              options={enumOptions(facets?.condition, d.condition, filters.condition)}
              selected={filters.condition}
              onToggle={(v) => toggle('condition', v)}
            />
          </Section>
          <GroupTitle title={f.engineDrivetrain} />
          <Section title={f.engineMin}>
            <StepChips
              steps={ENGINE_STEPS_L}
              value={filters.engineMinL}
              label={(l) => f.liters(l.toFixed(1))}
              onChange={(engineMinL) => set({ engineMinL })}
            />
          </Section>
          <Section title={f.fuelType}>
            <ChipList
              options={enumOptions(facets?.fuel, d.fuelType, filters.fuel)}
              selected={filters.fuel}
              onToggle={(v) => toggle('fuel', v)}
            />
          </Section>
          <Section title={f.drivetrain}>
            <ChipList
              options={enumOptions(facets?.drivetrain, d.drivetrain, filters.drivetrain)}
              selected={filters.drivetrain}
              onToggle={(v) => toggle('drivetrain', v)}
            />
          </Section>
          <Section title={f.transmission}>
            <ChipList
              options={enumOptions(facets?.transmission, d.transmission, filters.transmission)}
              selected={filters.transmission}
              onToggle={(v) => toggle('transmission', v)}
            />
          </Section>
          <GroupTitle title={f.conditionHistory} />
          <Section title={f.runDrive}>
            <ChipList
              options={enumOptions(facets?.drive_status, d.driveStatus, filters.driveStatus)}
              selected={filters.driveStatus}
              onToggle={(v) => toggle('driveStatus', v)}
            />
          </Section>
          <Section title={f.damage}>
            <ChipList
              options={enumOptions(facets?.damage, d.damageLevel, filters.damage)}
              selected={filters.damage}
              onToggle={(v) => toggle('damage', v)}
            />
          </Section>
          <Section title={f.primaryDamage}>
            <ChipList
              options={enumOptions(facets?.damage_area, d.damageArea, filters.damageArea)}
              selected={filters.damageArea}
              onToggle={(v) => toggle('damageArea', v)}
              initialVisible={6}
            />
          </Section>
          <Section title={f.title}>
            <ChipList
              options={enumOptions(facets?.title, d.titleStatus, filters.title)}
              selected={filters.title}
              onToggle={(v) => toggle('title', v)}
            />
          </Section>
          <Section title={f.history}>
            <ChipList
              options={enumOptions(facets?.history, d.historyFlag, filters.history)}
              selected={filters.history}
              onToggle={(v) => toggle('history', v)}
            />
          </Section>
          <GroupTitle title={f.exteriorInterior} />
          <Section title={f.exteriorColor}>
            <ChipList
              options={enumOptions(facets?.color, d.colorFamily, filters.color)}
              selected={filters.color}
              onToggle={(v) => toggle('color', v)}
            />
          </Section>
          <Section title={f.seats}>
            <StepChips
              steps={[4, 5, 6, 7, 8]}
              value={filters.seatsMin}
              label={(n) => `${n}+`}
              onChange={(seatsMin) => set({ seatsMin })}
            />
          </Section>
          <GroupTitle title={f.features} />
          {FEATURE_CATEGORY_ORDER.map((category) => {
            const options = (facets?.feature ?? [])
              .filter((feature) => feature.category === category)
              .map((feature) => ({
                value: feature.value,
                label: featureName({ slug: feature.value, name: feature.label }, locale),
                count: feature.count,
              }));
            if (options.length === 0) return null;
            return (
              <Section key={category} title={d.featureCategory[category]}>
                <ChipList
                  options={inStockFirst(options, filters.feature)}
                  selected={filters.feature}
                  onToggle={(v) => toggle('feature', v)}
                  initialVisible={6}
                />
              </Section>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

function withSelected(
  options: Option[],
  selected: readonly string[] = [],
  label = (v: string) => v,
) {
  const missing = selected
    .filter((value) => !options.some((o) => o.value === value))
    .map((value) => ({ value, label: label(value), count: 0 }));
  return [...options, ...missing];
}

/** Options with cars (or selected) first, so the first chips are the useful ones. */
function inStockFirst(options: Option[], selected: readonly string[] = []): Option[] {
  const useful = (o: Option) => o.count > 0 || selected.includes(o.value);
  return [...options.filter(useful), ...options.filter((o) => !useful(o))];
}

function GroupTitle({ title }: { title: string }) {
  return (
    <View className="border-t border-border pt-5">
      <Text variant="title" className="text-lg" accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

function rangeOf(min: number, max: number): number[] {
  if (max < min) return [];
  return Array.from({ length: max - min + 1 }, (_, i) => max - i);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text variant="heading" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function ChipList({
  options,
  selected = [],
  onToggle,
  initialVisible = 20,
}: {
  options: Option[];
  selected?: readonly string[];
  onToggle: (value: string) => void;
  initialVisible?: number;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  if (options.length === 0) {
    return <Text variant="caption">{t.filters.nothingYet}</Text>;
  }
  const visible = expanded ? options : options.slice(0, initialVisible);
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        {visible.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            count={option.count}
            selected={selected.includes(option.value)}
            onPress={() => onToggle(option.value)}
          />
        ))}
      </View>
      {options.length > initialVisible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((v) => !v)}
          className="min-h-11 justify-center self-start"
        >
          <Text className="font-sans-semibold text-sm text-primary">
            {expanded ? t.filters.showFewer : t.filters.showAll(options.length)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Single-choice chips; tapping the selected chip clears it. */
function StepChips({
  steps,
  value,
  label,
  onChange,
}: {
  steps: readonly number[];
  value: number | undefined;
  label: (value: number) => string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {steps.map((step) => (
        <Chip
          key={step}
          label={label(step)}
          selected={value === step}
          onPress={() => onChange(value === step ? undefined : step)}
        />
      ))}
    </View>
  );
}

function SheetBackground({ style }: BottomSheetBackgroundProps) {
  return <View style={style} className="rounded-t-3xl bg-card" />;
}

function SheetHandle() {
  return (
    <View className="items-center py-3">
      <View className="h-1.5 w-10 rounded-full bg-muted-foreground/40" />
    </View>
  );
}
