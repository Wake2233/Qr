'use client';

import type { InventoryFacets } from '@cp/api';
import {
  bodyTypeLabels,
  conditionLabels,
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

interface FilterPanelProps {
  filters: InventoryFilters;
  facets: InventoryFacets | undefined;
  onChange: (next: InventoryFilters) => void;
  className?: string;
}

const ANY = 'any';

/** Selected values stay listed (count 0) even when other filters exclude them. */
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

const enumOptions = (
  buckets: { value: string; count: number }[] | undefined,
  labels: Record<string, string>,
): Option[] =>
  (buckets ?? []).map((b) => ({
    value: b.value,
    label: labels[b.value] ?? b.value,
    count: b.count,
  }));

export function FilterPanel({ filters, facets, onChange, className }: FilterPanelProps) {
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
  const yearOptions = rangeOf(facets?.year.min ?? null, facets?.year.max ?? null);

  return (
    <div className={cn('divide-y', className)}>
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
            empty="No models match the other filters."
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
          options={withSelected(enumOptions(facets?.body, bodyTypeLabels), filters.body, (v) =>
            labelOf(bodyTypeLabels, v),
          )}
          selected={filters.body}
          onToggle={(v) => toggle('body', v)}
        />
      </Section>

      <Section title="Fuel type">
        <Checklist
          options={withSelected(enumOptions(facets?.fuel, fuelTypeLabels), filters.fuel, (v) =>
            labelOf(fuelTypeLabels, v),
          )}
          selected={filters.fuel}
          onToggle={(v) => toggle('fuel', v)}
        />
      </Section>

      <Section title="Drivetrain">
        <Checklist
          options={withSelected(
            enumOptions(facets?.drivetrain, drivetrainLabels),
            filters.drivetrain,
            (v) => labelOf(drivetrainLabels, v),
          )}
          selected={filters.drivetrain}
          onToggle={(v) => toggle('drivetrain', v)}
        />
      </Section>

      <Section title="Transmission">
        <Checklist
          options={withSelected(
            enumOptions(facets?.transmission, transmissionLabels),
            filters.transmission,
            (v) => labelOf(transmissionLabels, v),
          )}
          selected={filters.transmission}
          onToggle={(v) => toggle('transmission', v)}
        />
      </Section>

      <Section title="Condition">
        <Checklist
          options={withSelected(
            enumOptions(facets?.condition, conditionLabels),
            filters.condition,
            (v) => labelOf(conditionLabels, v),
          )}
          selected={filters.condition}
          onToggle={(v) => toggle('condition', v)}
        />
      </Section>

      <Section title="Exterior color">
        <Checklist
          options={withSelected(enumOptions(facets?.color, {}), filters.color)}
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

      <Section title="Features">
        <Checklist
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
          initialVisible={8}
        />
      </Section>
    </div>
  );
}

const labelOf = (labels: Record<string, string>, value: string) => labels[value] ?? value;

function rangeOf(min: number | null, max: number | null): number[] {
  if (min === null || max === null || max < min) return [];
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-3 py-5 first:pt-0">
      <h3 id={id} className="text-sm font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Checklist({
  options,
  selected = [],
  onToggle,
  initialVisible = 12,
  empty = 'Nothing matches the other filters.',
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
                <span className="flex-1 truncate">{option.label}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{option.count}</span>
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
