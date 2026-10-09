import type { InventoryFacets } from '@cp/api';
import {
  bodyTypeLabels,
  clearFilters,
  conditionLabels,
  countActiveFilters,
  drivetrainLabels,
  formatMileage,
  formatPrice,
  fuelTypeLabels,
  MILEAGE_STEPS,
  PRICE_STEPS_CENTS,
  toggleFilterValue,
  transmissionLabels,
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

type ListKey =
  | 'make'
  | 'model'
  | 'body'
  | 'fuel'
  | 'drivetrain'
  | 'transmission'
  | 'condition'
  | 'color'
  | 'feature';

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
  const toggle = (key: ListKey, value: string) =>
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
  const years = rangeOf(facets?.year.min ?? null, facets?.year.max ?? null);

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
          <Section title="Condition">
            <ChipList
              options={enumOptions(facets?.condition, conditionLabels, filters.condition)}
              selected={filters.condition}
              onToggle={(v) => toggle('condition', v)}
            />
          </Section>
          <Section title="Exterior color">
            <ChipList
              options={enumOptions(facets?.color, {}, filters.color)}
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
          <Section title="Features">
            <ChipList
              options={withSelected(
                (facets?.feature ?? []).map((f) => ({
                  value: f.value,
                  label: f.label,
                  count: f.count,
                })),
                filters.feature,
              )}
              selected={filters.feature}
              onToggle={(v) => toggle('feature', v)}
              initialVisible={10}
            />
          </Section>
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

function rangeOf(min: number | null, max: number | null): number[] {
  if (min === null || max === null || max < min) return [];
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
    return <Text variant="caption">Nothing matches the other filters.</Text>;
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
