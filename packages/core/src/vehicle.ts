/**
 * Vehicle display helpers shared by both VDPs: title, slug and grouped spec rows.
 * Values render exactly as stored — nothing is rounded or estimated (CLAUDE.md rule 7).
 */
import type { Enums, Tables } from '@cp/types';

import { formatMileage, formatPrice } from './format';

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

export const bodyTypeLabels: Record<Enums<'body_type'>, string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  pickup: 'Pickup truck',
  coupe: 'Coupe',
  convertible: 'Convertible',
  hatchback: 'Hatchback',
  wagon: 'Wagon',
  van: 'Van',
  minivan: 'Minivan',
};

export const fuelTypeLabels: Record<Enums<'fuel_type'>, string> = {
  gasoline: 'Gasoline',
  diesel: 'Diesel',
  hybrid: 'Hybrid',
  plug_in_hybrid: 'Plug-in hybrid',
  electric: 'Electric',
  flex_fuel: 'Flex fuel',
};

export const drivetrainLabels: Record<Enums<'drivetrain'>, string> = {
  fwd: 'Front-wheel drive (FWD)',
  rwd: 'Rear-wheel drive (RWD)',
  awd: 'All-wheel drive (AWD)',
  '4wd': 'Four-wheel drive (4WD)',
};

export const transmissionLabels: Record<Enums<'transmission'>, string> = {
  automatic: 'Automatic',
  manual: 'Manual',
  cvt: 'CVT',
  dct: 'Dual-clutch',
};

export const conditionLabels: Record<Enums<'vehicle_condition'>, string> = {
  new: 'New',
  used: 'Used',
  certified: 'Certified pre-owned',
};

export const titleStatusLabels: Record<Enums<'title_status'>, string> = {
  clean: 'Clean',
  rebuilt: 'Rebuilt',
  salvage: 'Salvage',
  lemon: 'Lemon / buyback',
  unknown: 'Unknown',
};

export const damageLevelLabels: Record<Enums<'damage_level'>, string> = {
  none: 'No damage',
  minor: 'Minor damage',
  moderate: 'Moderate damage',
  severe: 'Severe damage',
};

export const damageAreaLabels: Record<Enums<'damage_area'>, string> = {
  front: 'Front end',
  rear: 'Rear end',
  side: 'Side',
  roof: 'Roof',
  undercarriage: 'Undercarriage',
  all_over: 'All over',
  hail: 'Hail',
  flood: 'Flood / water',
  fire: 'Fire',
  mechanical: 'Mechanical',
  vandalism: 'Vandalism',
  normal_wear: 'Normal wear',
};

export const driveStatusLabels: Record<Enums<'drive_status'>, string> = {
  runs_and_drives: 'Run & Drive',
  starts: 'Starts, doesn’t drive',
  does_not_start: 'Doesn’t start',
};

export const colorFamilyLabels: Record<Enums<'color_family'>, string> = {
  black: 'Black',
  white: 'White',
  gray: 'Gray',
  silver: 'Silver',
  blue: 'Blue',
  red: 'Red',
  green: 'Green',
  brown: 'Brown',
  beige: 'Beige',
  gold: 'Gold',
  orange: 'Orange',
  yellow: 'Yellow',
  purple: 'Purple',
  other: 'Other',
};

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

export const historyFlagLabels: Record<HistoryFlag, string> = {
  no_accidents: 'No accidents reported',
  one_owner: 'One owner',
  service_records: 'Service records',
  clean_history: 'Clean history',
};

export const listingStatusLabels: Record<Enums<'listing_status'>, string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  active: 'For sale',
  reserved: 'Reserved',
  sold: 'Sold',
  archived: 'Archived',
};

export const featureCategoryLabels: Record<Enums<'feature_category'>, string> = {
  safety: 'Safety & driver assist',
  comfort: 'Comfort & convenience',
  technology: 'Technology',
  exterior: 'Exterior',
  interior: 'Interior',
  performance: 'Performance',
};

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

type Row = [key: string, label: string, value: string | null];

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

function rows(entries: Row[]): SpecCell[] {
  return entries.map(([key, label, value]) => ({ key, label, value }));
}

const str = <T>(value: T | null, fn: (v: T) => string): string | null =>
  value === null ? null : fn(value);

function fuelEconomy(city: number | null, highway: number | null): string | null {
  if (city !== null && highway !== null) return `${city} city / ${highway} hwy mpg`;
  if (city !== null) return `${city} city mpg`;
  if (highway !== null) return `${highway} hwy mpg`;
  return null;
}

/** Every spec row in display order, including empty ones (same shape for every vehicle). */
export function vehicleSpecGrid(v: VehicleSpecSource): SpecGrid[] {
  return [
    {
      id: 'overview',
      title: 'Overview',
      rows: rows([
        ['year', 'Year', String(v.year)],
        ['make', 'Make', v.make],
        ['model', 'Model', v.model],
        ['trim', 'Trim', v.trim],
        ['condition', 'Condition', conditionLabels[v.condition]],
        ['mileage', 'Mileage', str(v.mileage, formatMileage)],
        ['price_cents', 'Price', str(v.price_cents, (c) => formatPrice(c))],
        ['msrp_cents', 'Original MSRP', str(v.msrp_cents, (c) => formatPrice(c))],
        ['stock_number', 'Stock #', v.stock_number],
        ['vin', 'VIN', v.vin],
      ]),
    },
    {
      id: 'powertrain',
      title: 'Powertrain',
      rows: rows([
        ['fuel_type', 'Fuel type', str(v.fuel_type, (f) => fuelTypeLabels[f])],
        ['engine', 'Engine', v.engine],
        ['displacement_l', 'Displacement', str(v.displacement_l, (d) => `${d.toFixed(1)} L`)],
        ['cylinders', 'Cylinders', str(v.cylinders, String)],
        ['horsepower', 'Horsepower', str(v.horsepower, (hp) => `${hp} hp`)],
        ['torque_lbft', 'Torque', str(v.torque_lbft, (t) => `${t} lb-ft`)],
        ['transmission', 'Transmission', str(v.transmission, (t) => transmissionLabels[t])],
        ['drivetrain', 'Drivetrain', str(v.drivetrain, (d) => drivetrainLabels[d])],
        ['mpg', 'Fuel economy', fuelEconomy(v.mpg_city, v.mpg_highway)],
        ['ev_range_mi', 'Electric range', str(v.ev_range_mi, (mi) => `${mi} mi`)],
      ]),
    },
    {
      id: 'body_interior',
      title: 'Body & Interior',
      rows: rows([
        ['body_type', 'Body style', str(v.body_type, (b) => bodyTypeLabels[b])],
        ['exterior_color', 'Exterior color', v.exterior_color],
        ['interior_color', 'Interior color', v.interior_color],
        ['doors', 'Doors', str(v.doors, String)],
        ['seats', 'Seats', str(v.seats, String)],
      ]),
    },
    {
      id: 'history',
      title: 'History',
      rows: rows([
        ['title_status', 'Title', titleStatusLabels[v.title_status]],
        [
          'owners_count',
          'Previous owners',
          str(v.owners_count, (n) => (n === 0 ? 'None' : String(n))),
        ],
        [
          'accident_free',
          'Accident history',
          str(v.accident_free, (ok) => (ok ? 'No accidents reported' : 'Accident reported')),
        ],
        ['damage', 'Damage', str(v.damage ?? null, (d) => damageLevelLabels[d])],
        [
          'damage_area',
          'Primary damage',
          v.damage === 'none' ? null : str(v.damage_area ?? null, (a) => damageAreaLabels[a]),
        ],
        ['drive_status', 'Run & Drive', str(v.drive_status ?? null, (d) => driveStatusLabels[d])],
        [
          'service_records',
          'Service records',
          str(v.service_records ?? null, (ok) => (ok ? 'Available' : 'Not available')),
        ],
      ]),
    },
  ];
}

/** Overview / Powertrain / Body & Interior / History, omitting empty rows and groups. */
export function groupVehicleSpecs(v: VehicleSpecSource): SpecGroup[] {
  return vehicleSpecGrid(v).flatMap(({ id, title, rows: cells }) => {
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
): FeatureGroup[] {
  return FEATURE_CATEGORY_ORDER.flatMap((category) => {
    const names = features
      .filter((f) => f.category === category)
      .map((f) => f.name)
      .sort((a, b) => a.localeCompare(b));
    return names.length > 0
      ? [{ category, title: featureCategoryLabels[category], features: names }]
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
): ConditionBadge[] {
  const badges: ConditionBadge[] = [];
  if (v.drive_status) {
    badges.push({
      key: 'drive_status',
      label: driveStatusLabels[v.drive_status],
      tone: v.drive_status === 'runs_and_drives' ? 'positive' : 'caution',
    });
  }
  if (v.damage) {
    badges.push({
      key: 'damage',
      label: damageLevelLabels[v.damage],
      tone: v.damage === 'none' ? 'positive' : 'caution',
    });
  }
  if (v.title_status !== 'unknown') {
    badges.push({
      key: 'title',
      label: `${titleStatusLabels[v.title_status]} title`,
      tone: v.title_status === 'clean' ? 'positive' : 'caution',
    });
  }
  if (v.owners_count === 1) badges.push({ key: 'owners', label: '1 owner', tone: 'positive' });
  if (v.accident_free === true) {
    badges.push({ key: 'accidents', label: 'No accidents', tone: 'positive' });
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
export function vehicleImageAlt(title: string, view: string | null | undefined, index: number) {
  return `${title} – ${view?.trim() || `photo ${index + 1}`}`;
}
