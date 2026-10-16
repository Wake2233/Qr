import type { InventoryFacets } from '@cp/api';
import {
  bodyTypeLabels,
  clearFilters,
  colorFamilyLabels,
  conditionLabels,
  countActiveFilters,
  damageAreaLabels,
  damageLevelLabels,
  driveStatusLabels,
  drivetrainLabels,
  ENGINE_STEPS_L,
  FEATURE_CATEGORY_ORDER,
  featureCategoryLabels,
  formatMileage,
  formatPrice,
  fuelTypeLabels,
  historyFlagLabels,
  MILEAGE_STEPS,
  PRICE_STEPS_CENTS,
  titleStatusLabels,
  toggleFilterValue,
  transmissionLabels,
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
              title="Clear"
              variant="outline"
              className="flex-1"
              disabled={countActiveFilters(filters) === 0}
              onPress={() => onChange(clearFilters(filters))}
            />
            <Button
              title={total === undefined ? 'Show results' : `Show ${total} results`}
              className="flex-[2]"
              onPress={close}
            />
          </View>
        </SafeAreaView>
      </BottomSheetFooter>
    ),
    [filters, total, onChange, close],
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
      accessibilityLabel="Filters"
    >
      <BottomSheetScrollView>
        <View className="gap-6 px-4 pb-32">
          <Text variant="title" accessibilityRole="header">
            Filters
          </Text>
          <Section title="Make">
            <ChipList
              options={withSelected(
                (facets?.make ?? []).map((m) => ({
                  value: m.value,
                  label: m.label,
                  count: m.count,
                })),
                filters.make,
              )}
              selected={filters.make}
              onToggle={(v) => toggle('make', v)}
              initialVisible={12}
            />
          </Section>
          {filters.make?.length ? (
            <Section title="Model">
              <ChipList
                options={withSelected(
                  models.map((m) => ({ value: m.value, label: m.label, count: m.count })),
                  filters.model,
                )}
                selected={filters.model}
                onToggle={(v) => toggle('model', v)}
              />
            </Section>
          ) : null}
          <Section title="Max price">
            <StepChips
              steps={PRICE_STEPS_CENTS}
              value={filters.priceMaxCents}
              label={(c) => `Up to ${formatPrice(c)}`}
              onChange={(priceMaxCents) => set({ priceMaxCents })}
            />
          </Section>
          <Section title="Min price">
            <StepChips
              steps={PRICE_STEPS_CENTS}
              value={filters.priceMinCents}
              label={(c) => `From ${formatPrice(c)}`}
              onChange={(priceMinCents) => set({ priceMinCents })}
            />
          </Section>
          {years.length > 0 ? (
            <Section title="Model year (or newer)">
              <StepChips
                steps={years}
                value={filters.yearMin}
                label={String}
                onChange={(yearMin) => set({ yearMin })}
              />
            </Section>
          ) : null}
          <Section title="Mileage">
            <StepChips
              steps={MILEAGE_STEPS}
              value={filters.mileageMax}
              label={(m) => `Under ${formatMileage(m)}`}
              onChange={(mileageMax) => set({ mileageMax })}
            />
          </Section>
          <Section title="Body style">
            <ChipList
              options={enumOptions(facets?.body, bodyTypeLabels, filters.body)}
              selected={filters.body}
              onToggle={(v) => toggle('body', v)}
            />
          </Section>
          <Section title="Condition">
            <ChipList
              options={enumOptions(facets?.condition, conditionLabels, filters.condition)}
              selected={filters.condition}
              onToggle={(v) => toggle('condition', v)}
            />
          </Section>
          <GroupTitle title="Engine & drivetrain" />
          <Section title="Engine size (or larger)">
            <StepChips
              steps={ENGINE_STEPS_L}
              value={filters.engineMinL}
              label={(l) => `${l.toFixed(1)} L+`}
              onChange={(engineMinL) => set({ engineMinL })}
            />
          </Section>
          <Section title="Fuel type">
            <ChipList
              options={enumOptions(facets?.fuel, fuelTypeLabels, filters.fuel)}
              selected={filters.fuel}
              onToggle={(v) => toggle('fuel', v)}
            />
          </Section>
          <Section title="Drivetrain">
            <ChipList
              options={enumOptions(facets?.drivetrain, drivetrainLabels, filters.drivetrain)}
              selected={filters.drivetrain}
              onToggle={(v) => toggle('drivetrain', v)}
            />
          </Section>
          <Section title="Transmission">
            <ChipList
              options={enumOptions(facets?.transmission, transmissionLabels, filters.transmission)}
              selected={filters.transmission}
              onToggle={(v) => toggle('transmission', v)}
            />
          </Section>
          <GroupTitle title="Condition & history" />
          <Section title="Run & Drive">
            <ChipList
              options={enumOptions(facets?.drive_status, driveStatusLabels, filters.driveStatus)}
              selected={filters.driveStatus}
              onToggle={(v) => toggle('driveStatus', v)}
            />
          </Section>
          <Section title="Damage">
            <ChipList
              options={enumOptions(facets?.damage, damageLevelLabels, filters.damage)}
              selected={filters.damage}
              onToggle={(v) => toggle('damage', v)}
            />
          </Section>
          <Section title="Primary damage">
            <ChipList
              options={enumOptions(facets?.damage_area, damageAreaLabels, filters.damageArea)}
              selected={filters.damageArea}
              onToggle={(v) => toggle('damageArea', v)}
              initialVisible={6}
            />
          </Section>
          <Section title="Title">
            <ChipList
              options={enumOptions(facets?.title, titleStatusLabels, filters.title)}
              selected={filters.title}
              onToggle={(v) => toggle('title', v)}
            />
          </Section>
          <Section title="History">
            <ChipList
              options={enumOptions(facets?.history, historyFlagLabels, filters.history)}
              selected={filters.history}
              onToggle={(v) => toggle('history', v)}
            />
          </Section>
          <GroupTitle title="Exterior & interior" />
          <Section title="Exterior color">
            <ChipList
              options={enumOptions(facets?.color, colorFamilyLabels, filters.color)}
              selected={filters.color}
              onToggle={(v) => toggle('color', v)}
            />
          </Section>
          <Section title="Seats">
            <StepChips
              steps={[4, 5, 6, 7, 8]}
              value={filters.seatsMin}
              label={(n) => `${n}+`}
              onChange={(seatsMin) => set({ seatsMin })}
            />
          </Section>
          <GroupTitle title="Features" />
          {FEATURE_CATEGORY_ORDER.map((category) => {
            const options = (facets?.feature ?? [])
              .filter((f) => f.category === category)
              .map((f) => ({ value: f.value, label: f.label, count: f.count }));
            if (options.length === 0) return null;
            return (
              <Section key={category} title={featureCategoryLabels[category]}>
                <ChipList
                  options={options}
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
  const [expanded, setExpanded] = useState(false);
  if (options.length === 0) {
    return <Text variant="caption">Nothing to choose from yet.</Text>;
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
            {expanded ? 'Show fewer' : `Show all ${options.length}`}
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
