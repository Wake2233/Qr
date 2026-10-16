'use client';

import type { InventoryFacets } from '@cp/api';
import {
  bodyTypeLabels,
  colorFamilyLabels,
  colorFamilySwatches,
  conditionLabels,
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
import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
  count: number;
  /** CSS color for a small swatch (exterior color) */
  swatch?: string;
}

interface FilterPanelProps {
  filters: InventoryFilters;
  facets: InventoryFacets | undefined;
  onChange: (next: InventoryFilters) => void;
  className?: string;
}

const ANY = 'any';
const THIS_YEAR = new Date().getFullYear();

/** Selected values stay listed (count 0) even when the facets don't return them. */
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

/** Facet buckets → options; the RPC lists every enum value (count 0 when nothing matches). */
function enumOptions(
  buckets: { value: string; count: number }[] | undefined,
  labels: Record<string, string>,
  selected?: readonly string[],
): Option[] {
  const options = (buckets ?? []).map((b) => ({
    value: b.value,
    label: labels[b.value] ?? b.value,
    count: b.count,
  }));
  return withSelected(options, selected, (v) => labels[v] ?? v);
}

const listCount = (filters: InventoryFilters, keys: FilterListKey[]) =>
  keys.reduce((n, key) => n + (filters[key]?.length ?? 0), 0);
const setCount = (filters: InventoryFilters, keys: (keyof InventoryFilters)[]) =>
  keys.filter((key) => filters[key] !== undefined).length;

export function FilterPanel({ filters, facets, onChange, className }: FilterPanelProps) {
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

  const makes = withSelected(
    (facets?.make ?? []).map((m) => ({ value: m.value, label: m.label, count: m.count })),
    filters.make,
  );
  const models = withSelected(
    (facets?.model ?? [])
      .filter((m) => !filters.make?.length || filters.make.includes(m.make))
      .map((m) => ({ value: m.value, label: m.label, count: m.count })),
    filters.model,
  );
  // Before anything is listed the range is unknown: offer the last 25 model years.
  const yearOptions = rangeOf(
    facets?.year.min ?? THIS_YEAR - 25,
    facets?.year.max ?? THIS_YEAR + 1,
  );
  const engineOptions = ENGINE_STEPS_L.map((l) => ({ value: l, label: `${l.toFixed(1)} L` }));
  const colors = enumOptions(facets?.color, colorFamilyLabels, filters.color).map((o) => ({
    ...o,
    swatch: colorFamilySwatches[o.value as keyof typeof colorFamilySwatches],
  }));
  const features = facets?.feature ?? [];

  return (
    <div className={cn('divide-y', className)}>
      <Group
        title="Basics"
        defaultOpen
        active={
          listCount(filters, ['make', 'model', 'body', 'condition']) +
          setCount(filters, ['priceMinCents', 'priceMaxCents', 'yearMin', 'yearMax', 'mileageMax'])
        }
      >
        <Section title="Make">
          <Checklist
            options={makes}
            selected={filters.make}
            onToggle={(v) => toggle('make', v)}
            initialVisible={8}
          />
        </Section>

        {filters.make?.length ? (
          <Section title="Model">
            <Checklist
              options={models}
              selected={filters.model}
              onToggle={(v) => toggle('model', v)}
              initialVisible={8}
              empty="No models in our catalog for this make yet."
            />
          </Section>
        ) : null}

        <Section title="Price">
          <div className="grid grid-cols-2 gap-2">
            <RangeSelect
              label="Minimum price"
              value={filters.priceMinCents}
              options={PRICE_STEPS_CENTS.map((c) => ({ value: c, label: formatPrice(c) }))}
              onChange={(priceMinCents) => set({ priceMinCents })}
              anyLabel="No min"
              format={(c) => formatPrice(c)}
            />
            <RangeSelect
              label="Maximum price"
              value={filters.priceMaxCents}
              options={PRICE_STEPS_CENTS.map((c) => ({ value: c, label: formatPrice(c) }))}
              onChange={(priceMaxCents) => set({ priceMaxCents })}
              anyLabel="No max"
              format={(c) => formatPrice(c)}
            />
          </div>
        </Section>

        <Section title="Year">
          <div className="grid grid-cols-2 gap-2">
            <RangeSelect
              label="Oldest year"
              value={filters.yearMin}
              options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
              onChange={(yearMin) => set({ yearMin })}
              anyLabel="Any"
            />
            <RangeSelect
              label="Newest year"
              value={filters.yearMax}
              options={[...yearOptions].reverse().map((y) => ({ value: y, label: String(y) }))}
              onChange={(yearMax) => set({ yearMax })}
              anyLabel="Any"
            />
          </div>
        </Section>

        <Section title="Mileage">
          <RangeSelect
            label="Maximum mileage"
            value={filters.mileageMax}
            options={MILEAGE_STEPS.map((m) => ({ value: m, label: `Under ${formatMileage(m)}` }))}
            onChange={(mileageMax) => set({ mileageMax })}
            anyLabel="Any mileage"
            format={(m) => `Under ${formatMileage(m)}`}
          />
        </Section>

        <Section title="Body style">
          <Checklist
            options={enumOptions(facets?.body, bodyTypeLabels, filters.body)}
            selected={filters.body}
            onToggle={(v) => toggle('body', v)}
          />
        </Section>

        <Section title="Condition">
          <Checklist
            options={enumOptions(facets?.condition, conditionLabels, filters.condition)}
            selected={filters.condition}
            onToggle={(v) => toggle('condition', v)}
          />
        </Section>
      </Group>

      <Group
        title="Engine & drivetrain"
        active={
          listCount(filters, ['fuel', 'transmission', 'drivetrain']) +
          setCount(filters, ['engineMinL', 'engineMaxL'])
        }
      >
        <Section title="Fuel type">
          <Checklist
            options={enumOptions(facets?.fuel, fuelTypeLabels, filters.fuel)}
            selected={filters.fuel}
            onToggle={(v) => toggle('fuel', v)}
          />
        </Section>

        <Section title="Engine size">
          <div className="grid grid-cols-2 gap-2">
            <RangeSelect
              label="Smallest engine"
              value={filters.engineMinL}
              options={engineOptions}
              onChange={(engineMinL) => set({ engineMinL })}
              anyLabel="Any"
              format={(l) => `${l.toFixed(1)} L`}
            />
            <RangeSelect
              label="Largest engine"
              value={filters.engineMaxL}
              options={engineOptions}
              onChange={(engineMaxL) => set({ engineMaxL })}
              anyLabel="Any"
              format={(l) => `${l.toFixed(1)} L`}
            />
          </div>
        </Section>

        <Section title="Transmission">
          <Checklist
            options={enumOptions(facets?.transmission, transmissionLabels, filters.transmission)}
            selected={filters.transmission}
            onToggle={(v) => toggle('transmission', v)}
          />
        </Section>

        <Section title="Drivetrain">
          <Checklist
            options={enumOptions(facets?.drivetrain, drivetrainLabels, filters.drivetrain)}
            selected={filters.drivetrain}
            onToggle={(v) => toggle('drivetrain', v)}
          />
        </Section>
      </Group>

      <Group
        title="Condition & history"
        active={listCount(filters, ['driveStatus', 'damage', 'damageArea', 'title', 'history'])}
      >
        <Section title="Run & Drive">
          <Checklist
            options={enumOptions(facets?.drive_status, driveStatusLabels, filters.driveStatus)}
            selected={filters.driveStatus}
            onToggle={(v) => toggle('driveStatus', v)}
          />
        </Section>

        <Section title="Damage">
          <Checklist
            options={enumOptions(facets?.damage, damageLevelLabels, filters.damage)}
            selected={filters.damage}
            onToggle={(v) => toggle('damage', v)}
          />
        </Section>

        <Section title="Primary damage">
          <Checklist
            options={enumOptions(facets?.damage_area, damageAreaLabels, filters.damageArea)}
            selected={filters.damageArea}
            onToggle={(v) => toggle('damageArea', v)}
            initialVisible={6}
          />
        </Section>

        <Section title="Title">
          <Checklist
            options={enumOptions(facets?.title, titleStatusLabels, filters.title)}
            selected={filters.title}
            onToggle={(v) => toggle('title', v)}
          />
        </Section>

        <Section title="History">
          <Checklist
            options={enumOptions(facets?.history, historyFlagLabels, filters.history)}
            selected={filters.history}
            onToggle={(v) => toggle('history', v)}
          />
        </Section>
      </Group>

      <Group
        title="Exterior & interior"
        active={listCount(filters, ['color']) + setCount(filters, ['seatsMin'])}
      >
        <Section title="Exterior color">
          <Checklist
            options={colors}
            selected={filters.color}
            onToggle={(v) => toggle('color', v)}
            initialVisible={8}
          />
        </Section>

        <Section title="Seats">
          <RangeSelect
            label="Minimum seats"
            value={filters.seatsMin}
            options={[2, 4, 5, 6, 7, 8].map((n) => ({ value: n, label: `${n}+ seats` }))}
            onChange={(seatsMin) => set({ seatsMin })}
            anyLabel="Any"
          />
        </Section>
      </Group>

      <Group title="Features" active={listCount(filters, ['feature'])}>
        {FEATURE_CATEGORY_ORDER.map((category) => {
          const options = features
            .filter((f) => f.category === category)
            .map((f) => ({ value: f.value, label: f.label, count: f.count }));
          if (options.length === 0) return null;
          return (
            <Section key={category} title={featureCategoryLabels[category]} quiet>
              <Checklist
                options={options}
                selected={filters.feature}
                onToggle={(v) => toggle('feature', v)}
                initialVisible={6}
              />
            </Section>
          );
        })}
        {features.length === 0 ? (
          <p className="text-muted-foreground text-sm">Features are loading…</p>
        ) : null}
      </Group>
    </div>
  );
}

function rangeOf(min: number, max: number): number[] {
  if (max < min) return [];
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

/** A collapsible block of sections; the header shows how many of its filters are on. */
function Group({
  title,
  active,
  defaultOpen = false,
  children,
}: {
  title: string;
  active: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  // Groups with an active filter start open, so a shared link shows what's applied.
  const [open, setOpen] = useState(defaultOpen || active > 0);
  const id = useId();
  return (
    <section className="py-1 first:-mt-3">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          className="focus-visible:ring-ring/50 flex min-h-12 w-full items-center gap-2 rounded-md text-left font-semibold outline-none focus-visible:ring-[3px]"
        >
          <span className="flex-1">{title}</span>
          {active > 0 ? (
            <span className="bg-primary text-primary-foreground grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs tabular-nums">
              {active}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 transition-transform motion-reduce:transition-none',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </h3>
      <div id={id} hidden={!open} className="pb-4">
        {children}
      </div>
    </section>
  );
}

function Section({
  title,
  quiet = false,
  children,
}: {
  title: string;
  /** smaller sub-heading (feature categories) */
  quiet?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="space-y-2 py-3">
      <h4
        id={id}
        className={cn(
          'text-sm',
          quiet ? 'text-muted-foreground font-medium' : 'text-foreground font-medium',
        )}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function Checklist({
  options,
  selected = [],
  onToggle,
  initialVisible = 12,
  empty = 'Nothing to choose from yet.',
}: {
  options: Option[];
  selected?: readonly string[];
  onToggle: (value: string) => void;
  initialVisible?: number;
  empty?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const baseId = useId();
  if (options.length === 0) return <p className="text-muted-foreground text-sm">{empty}</p>;
  const visible = expanded ? options : options.slice(0, initialVisible);
  return (
    <div className="space-y-1">
      <ul className="space-y-0.5">
        {visible.map((option) => {
          const id = `${baseId}-${option.value}`;
          const checked = selected.includes(option.value);
          // Nothing matches right now: still selectable, just quieter.
          const muted = option.count === 0 && !checked;
          return (
            <li key={option.value}>
              <label
                htmlFor={id}
                className="hover:bg-muted/70 flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-2 text-sm"
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={() => onToggle(option.value)}
                />
                {option.swatch ? (
                  <span
                    aria-hidden
                    className="size-3.5 shrink-0 rounded-full border border-black/15 dark:border-white/25"
                    style={{ background: option.swatch }}
                  />
                ) : null}
                <span className={cn('flex-1 truncate', muted && 'text-muted-foreground')}>
                  {option.label}
                </span>
                <span
                  className={cn(
                    'text-muted-foreground text-xs tabular-nums',
                    muted && 'opacity-60',
                  )}
                >
                  {option.count}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {options.length > initialVisible ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-primary px-2 text-sm font-medium hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? 'Show fewer' : `Show all ${options.length}`}
        </button>
      ) : null}
    </div>
  );
}

function RangeSelect({
  label,
  value,
  options,
  onChange,
  anyLabel,
  format = String,
}: {
  label: string;
  value: number | undefined;
  options: { value: number; label: string }[];
  onChange: (value: number | undefined) => void;
  anyLabel: string;
  format?: (value: number) => string;
}) {
  // Keep a URL value selectable even if it isn't one of the presets (e.g. a shared link).
  const all =
    value !== undefined && !options.some((o) => o.value === value)
      ? [...options, { value, label: format(value) }].sort((a, b) => a.value - b.value)
      : options;
  return (
    <Select
      value={value === undefined ? ANY : String(value)}
      onValueChange={(next) => {
        const parsed = next === ANY ? undefined : Number(next);
        if (parsed !== value) onChange(parsed);
      }}
    >
      <SelectTrigger aria-label={label} className="w-full">
        {/* Explicit label so the server render shows the value before hydration. */}
        <SelectValue>
          {value === undefined
            ? anyLabel
            : (all.find((o) => o.value === value)?.label ?? format(value))}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{anyLabel}</SelectItem>
        {all.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
