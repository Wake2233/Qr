/**
 * Vehicle display helpers shared by both VDPs: title, slug and grouped spec rows.
 * Values render exactly as stored — nothing is rounded or estimated (CLAUDE.md rule 7).
 */
import type { Enums, Tables } from '@cp/types';

import { formatMileage, formatPrice } from './format';
import { coreDictionary, type Locale } from './i18n';
import { en } from './i18n/en';

export interface VehicleTitleParts {
  year: number;
  make: string;
  model: string;
  trim?: string | null;
}

/** "2021 BMW X5 xDrive40i" */
export function vehicleTitle({ year, make, model, trim }: VehicleTitleParts): string {
  return [year, make, model, trim?.trim()].filter(Boolean).join(' ');
}

/**
 * Mirrors the slug computed by the `vehicles_before_write` trigger, e.g.
 * `2021-bmw-x5-xdrive40i-1a2b3c4d`. The database value is authoritative.
 */
export function vehicleSlug(parts: VehicleTitleParts & { id: string }): string {
  const base = vehicleTitle(parts)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return `${base}-${parts.id.replace(/-/g, '').slice(0, 8)}`;
}

// English label maps (the consoles use these directly). Buyer screens use
// `coreDictionary(locale)` from ./i18n for the same keys in English or Georgian.
export const bodyTypeLabels: Record<Enums<'body_type'>, string> = en.bodyType;
export const fuelTypeLabels: Record<Enums<'fuel_type'>, string> = en.fuelType;
export const drivetrainLabels: Record<Enums<'drivetrain'>, string> = en.drivetrain;
export const transmissionLabels: Record<Enums<'transmission'>, string> = en.transmission;
export const conditionLabels: Record<Enums<'vehicle_condition'>, string> = en.condition;
export const titleStatusLabels: Record<Enums<'title_status'>, string> = en.titleStatus;
export const damageLevelLabels: Record<Enums<'damage_level'>, string> = en.damageLevel;
export const damageAreaLabels: Record<Enums<'damage_area'>, string> = en.damageArea;
export const driveStatusLabels: Record<Enums<'drive_status'>, string> = en.driveStatus;
export const colorFamilyLabels: Record<Enums<'color_family'>, string> = en.colorFamily;
export const listingStatusLabels: Record<Enums<'listing_status'>, string> = en.listingStatus;
export const featureCategoryLabels: Record<Enums<'feature_category'>, string> = en.featureCategory;

/** Swatch colors for the color filter (display only). */
export const colorFamilySwatches: Record<Enums<'color_family'>, string> = {
  black: '#111111',
  white: '#ffffff',
  gray: '#8a8d91',
  silver: '#c7c9cc',
  blue: '#2457a6',
  red: '#b3202a',
  green: '#2f6b3a',
  brown: '#6b4a2f',
  beige: '#d8c8a8',
  gold: '#c9a227',
  orange: '#e0731f',
  yellow: '#efcf2f',
  purple: '#6a3d9a',
  other: 'conic-gradient(#e33, #ec3, #3c6, #39e, #a3e, #e33)',
};

/** History checkboxes in the filter rail; every selected flag must hold. */
export const HISTORY_FLAGS = [
  'no_accidents',
  'one_owner',
  'service_records',
  'clean_history',
] as const;
export type HistoryFlag = (typeof HISTORY_FLAGS)[number];

export const historyFlagLabels: Record<HistoryFlag, string> = en.historyFlag;

export const FEATURE_CATEGORY_ORDER: Enums<'feature_category'>[] = [
  'safety',
  'technology',
  'comfort',
  'interior',
  'exterior',
  'performance',
];

export type SpecGroupId = 'overview' | 'powertrain' | 'body_interior' | 'history';

export interface SpecRow {
  key: string;
  label: string;
  value: string;
}

export interface SpecGroup {
  id: SpecGroupId;
  title: string;
  rows: SpecRow[];
}

/** Columns the VDP renders. Every non-null value appears in exactly one group. */
export type VehicleSpecSource = Pick<
  Tables<'vehicles'>,
  | 'year'
  | 'trim'
  | 'condition'
  | 'mileage'
  | 'price_cents'
  | 'msrp_cents'
  | 'stock_number'
  | 'vin'
  | 'body_type'
  | 'exterior_color'
  | 'interior_color'
  | 'doors'
  | 'seats'
  | 'fuel_type'
  | 'drivetrain'
  | 'transmission'
  | 'engine'
  | 'cylinders'
  | 'displacement_l'
  | 'horsepower'
  | 'torque_lbft'
  | 'mpg_city'
  | 'mpg_highway'
  | 'ev_range_mi'
  | 'owners_count'
  | 'accident_free'
  | 'title_status'
> &
  Partial<
    Pick<Tables<'vehicles'>, 'damage' | 'damage_area' | 'drive_status' | 'service_records'>
  > & {
    make: string;
    model: string;
  };

/** A spec row that may be empty: compare tables keep every row so columns line up. */
export interface SpecCell {
  key: string;
  label: string;
  value: string | null;
}

export interface SpecGrid {
  id: SpecGroupId;
  title: string;
  rows: SpecCell[];
}

const str = <T>(value: T | null, fn: (v: T) => string): string | null =>
  value === null ? null : fn(value);

/** Every spec row in display order, including empty ones (same shape for every vehicle). */
export function vehicleSpecGrid(v: VehicleSpecSource, locale?: Locale): SpecGrid[] {
  const d = coreDictionary(locale);
  const row = (key: keyof typeof d.spec, value: string | null): SpecCell => ({
    key,
    label: d.spec[key],
    value,
  });
  return [
    {
      id: 'overview',
      title: d.specGroup.overview,
      rows: [
        row('year', String(v.year)),
        row('make', v.make),
        row('model', v.model),
        row('trim', v.trim),
        row('condition', d.condition[v.condition]),
        row(
          'mileage',
          str(v.mileage, (mi) => formatMileage(mi, locale)),
        ),
        row(
          'price_cents',
          str(v.price_cents, (c) => formatPrice(c)),
        ),
        row(
          'msrp_cents',
          str(v.msrp_cents, (c) => formatPrice(c)),
        ),
        row('stock_number', v.stock_number),
        row('vin', v.vin),
      ],
    },
    {
      id: 'powertrain',
      title: d.specGroup.powertrain,
      rows: [
        row(
          'fuel_type',
          str(v.fuel_type, (f) => d.fuelType[f]),
        ),
        row('engine', v.engine),
        row(
          'displacement_l',
          str(v.displacement_l, (l) => `${l.toFixed(1)} ${d.unit.liters}`),
        ),
        row('cylinders', str(v.cylinders, String)),
        row(
          'horsepower',
          str(v.horsepower, (hp) => `${hp} ${d.unit.horsepower}`),
        ),
        row(
          'torque_lbft',
          str(v.torque_lbft, (t) => `${t} ${d.unit.torque}`),
        ),
        row(
          'transmission',
          str(v.transmission, (t) => d.transmission[t]),
        ),
        row(
          'drivetrain',
          str(v.drivetrain, (dt) => d.drivetrain[dt]),
        ),
        row(
          'mpg',
          v.mpg_city === null && v.mpg_highway === null
            ? null
            : d.unit.mpg(v.mpg_city, v.mpg_highway),
        ),
        row(
          'ev_range_mi',
          str(v.ev_range_mi, (mi) => `${mi} ${d.unit.miles}`),
        ),
      ],
    },
    {
      id: 'body_interior',
      title: d.specGroup.body_interior,
      rows: [
        row(
          'body_type',
          str(v.body_type, (b) => d.bodyType[b]),
        ),
        row('exterior_color', v.exterior_color),
        row('interior_color', v.interior_color),
        row('doors', str(v.doors, String)),
        row('seats', str(v.seats, String)),
      ],
    },
    {
      id: 'history',
      title: d.specGroup.history,
      rows: [
        row('title_status', d.titleStatus[v.title_status]),
        row(
          'owners_count',
          str(v.owners_count, (n) => (n === 0 ? d.value.noOwners : String(n))),
        ),
        row(
          'accident_free',
          str(v.accident_free, (ok) => (ok ? d.value.noAccidents : d.value.accidentReported)),
        ),
        row(
          'damage',
          str(v.damage ?? null, (dmg) => d.damageLevel[dmg]),
        ),
        row(
          'damage_area',
          v.damage === 'none' ? null : str(v.damage_area ?? null, (a) => d.damageArea[a]),
        ),
        row(
          'drive_status',
          str(v.drive_status ?? null, (ds) => d.driveStatus[ds]),
        ),
        row(
          'service_records',
          str(v.service_records ?? null, (ok) => (ok ? d.value.available : d.value.notAvailable)),
        ),
      ],
    },
  ];
}

/** Overview / Powertrain / Body & Interior / History, omitting empty rows and groups. */
export function groupVehicleSpecs(v: VehicleSpecSource, locale?: Locale): SpecGroup[] {
  return vehicleSpecGrid(v, locale).flatMap(({ id, title, rows: cells }) => {
    const filled = cells.flatMap(({ key, label, value }) =>
      value === null ? [] : [{ key, label, value }],
    );
    return filled.length > 0 ? [{ id, title, rows: filled }] : [];
  });
}

export interface FeatureGroup {
  category: Enums<'feature_category'>;
  title: string;
  features: string[];
}

/** Groups features by category in a fixed display order; names sorted within a group. */
export function groupFeatures(
  features: Pick<Tables<'features'>, 'name' | 'category'>[],
  locale?: Locale,
): FeatureGroup[] {
  const d = coreDictionary(locale);
  return FEATURE_CATEGORY_ORDER.flatMap((category) => {
    const names = features
      .filter((f) => f.category === category)
      .map((f) => f.name)
      .sort((a, b) => a.localeCompare(b, locale));
    return names.length > 0
      ? [{ category, title: d.featureCategory[category], features: names }]
      : [];
  });
}

export interface ConditionBadge {
  key: 'drive_status' | 'damage' | 'title' | 'owners' | 'accidents';
  label: string;
  /** good news (green) vs. something a buyer should know (amber) */
  tone: 'positive' | 'caution';
}

/** Short trust badges near the price ("Run & Drive · No damage · Clean title · 1 owner"). */
export function conditionBadges(
  v: Pick<VehicleSpecSource, 'title_status' | 'owners_count' | 'accident_free'> &
    Partial<Pick<VehicleSpecSource, 'damage' | 'drive_status'>>,
  locale?: Locale,
): ConditionBadge[] {
  const d = coreDictionary(locale);
  const badges: ConditionBadge[] = [];
  if (v.drive_status) {
    badges.push({
      key: 'drive_status',
      label: d.driveStatus[v.drive_status],
      tone: v.drive_status === 'runs_and_drives' ? 'positive' : 'caution',
    });
  }
  if (v.damage) {
    badges.push({
      key: 'damage',
      label: d.damageLevel[v.damage],
      tone: v.damage === 'none' ? 'positive' : 'caution',
    });
  }
  if (v.title_status !== 'unknown') {
    badges.push({
      key: 'title',
      label: d.badge.title(d.titleStatus[v.title_status]),
      tone: v.title_status === 'clean' ? 'positive' : 'caution',
    });
  }
  if (v.owners_count === 1)
    badges.push({ key: 'owners', label: d.badge.oneOwner, tone: 'positive' });
  if (v.accident_free === true) {
    badges.push({ key: 'accidents', label: d.badge.noAccidents, tone: 'positive' });
  }
  return badges;
}

/** Amount of the most recent price drop, or null if the last change wasn't a decrease. */
export function priceDropCents(
  previousPriceCents: number | null | undefined,
  currentPriceCents: number | null | undefined,
): number | null {
  if (previousPriceCents == null || currentPriceCents == null) return null;
  return previousPriceCents > currentPriceCents ? previousPriceCents - currentPriceCents : null;
}

/** Image alt text: vehicle title + view, e.g. "2021 BMW X5 – front three-quarter". */
export function vehicleImageAlt(
  title: string,
  view: string | null | undefined,
  index: number,
  locale?: Locale,
) {
  return `${title} – ${view?.trim() || coreDictionary(locale).photo(index + 1)}`;
}
