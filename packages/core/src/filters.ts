/**
 * Inventory filter state ⇄ URL query string. Web keeps filters in the URL (shareable links);
 * mobile uses the same serialization for deep links and saved searches.
 *
 * Money is integer cents internally and whole dollars in the URL (`price_max=40000`).
 * Parsing is lenient: unknown keys and invalid values are dropped, never thrown.
 */
import { Constants, type Enums } from '@cp/types';

import { formatMileage, formatPrice } from './format';
import {
  bodyTypeLabels,
  conditionLabels,
  drivetrainLabels,
  fuelTypeLabels,
  transmissionLabels,
} from './vehicle';

const E = Constants.public.Enums;

export const SORT_OPTIONS = [
  'newest',
  'price_asc',
  'price_desc',
  'mileage_asc',
  'year_desc',
] as const;
export type InventorySort = (typeof SORT_OPTIONS)[number];
export const DEFAULT_SORT: InventorySort = 'newest';

export const sortLabels: Record<InventorySort, string> = {
  newest: 'Newest listings',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  mileage_asc: 'Lowest mileage',
  year_desc: 'Newest model year',
};

export interface InventoryFilters {
  q?: string;
  make?: string[];
  model?: string[];
  body?: Enums<'body_type'>[];
  fuel?: Enums<'fuel_type'>[];
  drivetrain?: Enums<'drivetrain'>[];
  transmission?: Enums<'transmission'>[];
  condition?: Enums<'vehicle_condition'>[];
  color?: string[];
  feature?: string[];
  yearMin?: number;
  yearMax?: number;
  priceMinCents?: number;
  priceMaxCents?: number;
  mileageMax?: number;
  seatsMin?: number;
  dealer?: string;
  sort?: InventorySort;
  page?: number;
}

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
type NumberKey = 'yearMin' | 'yearMax' | 'mileageMax' | 'seatsMin' | 'page';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const isSlug = (value: string) => value.length <= 120 && SLUG.test(value);
const oneOf =
  <T extends string>(allowed: readonly T[]) =>
  (value: string): value is T =>
    (allowed as readonly string[]).includes(value);

const LIST_PARAMS: Record<ListKey, (value: string) => boolean> = {
  make: isSlug,
  model: isSlug,
  body: oneOf(E.body_type),
  fuel: oneOf(E.fuel_type),
  drivetrain: oneOf(E.drivetrain),
  transmission: oneOf(E.transmission),
  condition: oneOf(E.vehicle_condition),
  color: (value) => value.length > 0 && value.length <= 40 && !value.includes(','),
  feature: isSlug,
};

const NUMBER_PARAMS: Record<NumberKey, string> = {
  yearMin: 'year_min',
  yearMax: 'year_max',
  mileageMax: 'mileage_max',
  seatsMin: 'seats_min',
  page: 'page',
};

const PRICE_PARAMS = { priceMinCents: 'price_min', priceMaxCents: 'price_max' } as const;

/** Order of keys in serialized URLs, so equal filters always produce identical strings. */
const PARAM_ORDER = [
  'q',
  'make',
  'model',
  'body',
  'fuel',
  'drivetrain',
  'transmission',
  'condition',
  'color',
  'feature',
  'year_min',
  'year_max',
  'price_min',
  'price_max',
  'mileage_max',
  'seats_min',
  'dealer',
  'sort',
  'page',
] as const;

const MAX_LIST_VALUES = 30;

/** Anything with `getAll` (URLSearchParams, Next's ReadonlyURLSearchParams). */
export interface QueryParamsLike {
  getAll(key: string): string[];
}

/** A query string, a params object, or Next's `searchParams` record. */
export type SearchParamsInput =
  QueryParamsLike | string | Record<string, string | string[] | undefined>;

const decode = (value: string) => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

/**
 * Normalizes input to a multimap. Implemented without URLSearchParams so core stays
 * runtime-agnostic (React Native's built-in URLSearchParams is incomplete).
 */
function toMultiMap(input: SearchParamsInput): QueryParamsLike {
  if (typeof input === 'object' && 'getAll' in input && typeof input.getAll === 'function') {
    return input as QueryParamsLike;
  }
  const map = new Map<string, string[]>();
  const add = (key: string, value: string) => map.set(key, [...(map.get(key) ?? []), value]);
  if (typeof input === 'string') {
    for (const pair of input.replace(/^\?/, '').split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      add(
        decode(eq === -1 ? pair : pair.slice(0, eq)),
        eq === -1 ? '' : decode(pair.slice(eq + 1)),
      );
    }
  } else {
    for (const [key, value] of Object.entries(
      input as Record<string, string | string[] | undefined>,
    )) {
      for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value])
        add(key, v);
    }
  }
  return { getAll: (key) => map.get(key) ?? [] };
}

const first = (params: QueryParamsLike, key: string): string | null =>
  params.getAll(key)[0] ?? null;

function parsePositiveInt(raw: string | null): number | undefined {
  if (raw === null || !/^\d{1,9}$/.test(raw.trim())) return undefined;
  const value = Number(raw.trim());
  return value > 0 ? value : undefined;
}

/** Parses URL params (repeated keys or comma-separated values) into normalized filters. */
export function parseInventoryFilters(input: SearchParamsInput): InventoryFilters {
  const params = toMultiMap(input);
  const filters: InventoryFilters = {};

  const q = first(params, 'q')?.trim().slice(0, 100);
  if (q) filters.q = q;

  for (const [key, isValid] of Object.entries(LIST_PARAMS) as [ListKey, (v: string) => boolean][]) {
    const values = params
      .getAll(key)
      .flatMap((raw: string) => raw.split(','))
      .map((v: string) => (key === 'color' ? v.trim() : v.trim().toLowerCase()))
      .filter(isValid);
    if (values.length > 0) {
      (filters[key] as string[]) = [...new Set(values)].sort().slice(0, MAX_LIST_VALUES);
    }
  }

  for (const [key, param] of Object.entries(NUMBER_PARAMS) as [NumberKey, string][]) {
    const value = parsePositiveInt(first(params, param));
    if (value !== undefined) filters[key] = value;
  }
  if (filters.page === 1) delete filters.page;

  for (const [key, param] of Object.entries(PRICE_PARAMS) as [
    keyof typeof PRICE_PARAMS,
    string,
  ][]) {
    const dollars = parsePositiveInt(first(params, param));
    if (dollars !== undefined) filters[key] = dollars * 100;
  }

  const dealer = first(params, 'dealer')?.trim().toLowerCase();
  if (dealer && isSlug(dealer)) filters.dealer = dealer;

  const sort = first(params, 'sort');
  if (sort && oneOf(SORT_OPTIONS)(sort) && sort !== DEFAULT_SORT) filters.sort = sort;

  return filters;
}

/** Serializes filters to canonical params: sorted lists, defaults omitted, dollars for money. */
export function serializeInventoryFilters(filters: InventoryFilters): Record<string, string> {
  const entries = new Map<string, string>();
  if (filters.q?.trim()) entries.set('q', filters.q.trim());
  for (const key of Object.keys(LIST_PARAMS) as ListKey[]) {
    const values = filters[key];
    if (values && values.length > 0) entries.set(key, [...new Set(values)].sort().join(','));
  }
  for (const [key, param] of Object.entries(NUMBER_PARAMS) as [NumberKey, string][]) {
    const value = filters[key];
    if (value !== undefined && !(key === 'page' && value === 1)) entries.set(param, String(value));
  }
  for (const [key, param] of Object.entries(PRICE_PARAMS) as [
    keyof typeof PRICE_PARAMS,
    string,
  ][]) {
    const cents = filters[key];
    if (cents !== undefined) entries.set(param, String(Math.floor(cents / 100)));
  }
  if (filters.dealer) entries.set('dealer', filters.dealer);
  if (filters.sort && filters.sort !== DEFAULT_SORT) entries.set('sort', filters.sort);

  const params: Record<string, string> = {};
  for (const key of PARAM_ORDER) {
    const value = entries.get(key);
    if (value !== undefined) params[key] = value;
  }
  return params;
}

/** Canonical query string without the leading `?`; commas stay readable (`make=audi,bmw`). */
export function inventoryQueryString(filters: InventoryFilters): string {
  return Object.entries(serializeInventoryFilters(filters))
    .map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%2C/g, ',')}`)
    .join('&');
}

/** `/inventory?make=bmw&…` (or just the pathname when no filters are set). */
export function inventoryHref(filters: InventoryFilters, pathname = '/inventory'): string {
  const query = inventoryQueryString(filters);
  return query ? `${pathname}?${query}` : pathname;
}

/** Adds or removes one value of a multi-select facet; resets pagination. */
export function toggleFilterValue<K extends ListKey>(
  filters: InventoryFilters,
  key: K,
  value: NonNullable<InventoryFilters[K]>[number],
): InventoryFilters {
  const current = (filters[key] ?? []) as string[];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value].sort();
  const { page: _page, ...rest } = filters;
  return next.length > 0 ? { ...rest, [key]: next } : omit(rest, key);
}

function omit<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const { [key]: _removed, ...rest } = value;
  return rest;
}

/** Number of active refinements (for the "Filters (3)" badge). Sort and page don't count. */
export function countActiveFilters(filters: InventoryFilters): number {
  let count = filters.q ? 1 : 0;
  for (const key of Object.keys(LIST_PARAMS) as ListKey[]) count += filters[key]?.length ?? 0;
  for (const key of [
    'yearMin',
    'yearMax',
    'priceMinCents',
    'priceMaxCents',
    'mileageMax',
    'seatsMin',
    'dealer',
  ] as const) {
    if (filters[key] !== undefined) count += 1;
  }
  return count;
}

/** Budget / price steps (cents) for the hero search, filter rail and mobile sheet. */
export const PRICE_STEPS_CENTS = [
  1_000_000, 1_500_000, 2_000_000, 2_500_000, 3_000_000, 4_000_000, 5_000_000, 7_500_000,
  10_000_000,
] as const;
/** "Mileage up to" steps. */
export const MILEAGE_STEPS = [10_000, 25_000, 50_000, 75_000, 100_000, 150_000] as const;

export interface FilterLabels {
  /** slug → display name, usually from the facet response */
  make?: Readonly<Record<string, string>>;
  model?: Readonly<Record<string, string>>;
  feature?: Readonly<Record<string, string>>;
  dealer?: Readonly<Record<string, string>>;
}

export interface FilterChip {
  /** stable React key, e.g. `make:bmw` */
  id: string;
  label: string;
  /** filters with this refinement removed (page reset) */
  next: InventoryFilters;
}

const LIST_LABELS: Record<ListKey, (value: string, labels: FilterLabels) => string> = {
  make: (v, l) => l.make?.[v] ?? v,
  model: (v, l) => l.model?.[v] ?? v,
  body: (v) => bodyTypeLabels[v as Enums<'body_type'>],
  fuel: (v) => fuelTypeLabels[v as Enums<'fuel_type'>],
  drivetrain: (v) => drivetrainLabels[v as Enums<'drivetrain'>],
  transmission: (v) => transmissionLabels[v as Enums<'transmission'>],
  condition: (v) => conditionLabels[v as Enums<'vehicle_condition'>],
  color: (v) => v,
  feature: (v, l) => l.feature?.[v] ?? v,
};

type ScalarKey =
  | 'q'
  | 'yearMin'
  | 'yearMax'
  | 'priceMinCents'
  | 'priceMaxCents'
  | 'mileageMax'
  | 'seatsMin'
  | 'dealer';

const SCALAR_LABELS: Record<ScalarKey, (filters: InventoryFilters, labels: FilterLabels) => string> =
  {
    q: (f) => `“${f.q ?? ''}”`,
    yearMin: (f) => `${f.yearMin} or newer`,
    yearMax: (f) => `${f.yearMax} or older`,
    priceMinCents: (f) => `From ${formatPrice(f.priceMinCents ?? 0)}`,
    priceMaxCents: (f) => `Up to ${formatPrice(f.priceMaxCents ?? 0)}`,
    mileageMax: (f) => `Under ${formatMileage(f.mileageMax ?? 0)}`,
    seatsMin: (f) => `${f.seatsMin}+ seats`,
    dealer: (f, l) => l.dealer?.[f.dealer ?? ''] ?? f.dealer ?? '',
  };

/** One removable chip per active refinement, in URL order. Sort and page are not chips. */
export function activeFilterChips(
  filters: InventoryFilters,
  labels: FilterLabels = {},
): FilterChip[] {
  const { page: _page, ...base } = filters;
  const chips: FilterChip[] = [];
  if (base.q) chips.push({ id: 'q', label: SCALAR_LABELS.q(base, labels), next: omit(base, 'q') });
  for (const key of Object.keys(LIST_PARAMS) as ListKey[]) {
    for (const value of base[key] ?? []) {
      chips.push({
        id: `${key}:${value}`,
        label: LIST_LABELS[key](value, labels),
        next: toggleFilterValue(base, key, value as never),
      });
    }
  }
  for (const key of Object.keys(SCALAR_LABELS) as ScalarKey[]) {
    if (key === 'q' || base[key] === undefined) continue;
    chips.push({ id: key, label: SCALAR_LABELS[key](base, labels), next: omit(base, key) });
  }
  return chips;
}

/** "Clear all": drops every refinement but keeps the chosen sort. */
export function clearFilters(filters: InventoryFilters): InventoryFilters {
  return filters.sort ? { sort: filters.sort } : {};
}
