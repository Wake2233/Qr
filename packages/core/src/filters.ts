/**
 * Inventory filter state ⇄ URL query string. Web keeps filters in the URL (shareable links);
 * mobile uses the same serialization for deep links and saved searches.
 *
 * Money is integer cents internally and whole dollars in the URL (`price_max=40000`).
 * Parsing is lenient: unknown keys and invalid values are dropped, never thrown.
 */
import { Constants, type Enums } from '@cp/types';

import { formatMileage, formatPrice } from './format';
import { coreDictionary, type CoreDictionary, type Locale } from './i18n';
import { en } from './i18n/en';
import { HISTORY_FLAGS, type HistoryFlag } from './vehicle';

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

/** English sort labels (`coreDictionary(locale).sort` for other languages). */
export const sortLabels: Record<InventorySort, string> = en.sort;

export interface InventoryFilters {
  q?: string;
  make?: string[];
  model?: string[];
  body?: Enums<'body_type'>[];
  fuel?: Enums<'fuel_type'>[];
  drivetrain?: Enums<'drivetrain'>[];
  transmission?: Enums<'transmission'>[];
  condition?: Enums<'vehicle_condition'>[];
  /** exterior color family (`white`, `gray`…), derived from the paint name in the DB */
  color?: Enums<'color_family'>[];
  feature?: string[];
  damage?: Enums<'damage_level'>[];
  damageArea?: Enums<'damage_area'>[];
  driveStatus?: Enums<'drive_status'>[];
  title?: Enums<'title_status'>[];
  /** every selected flag must hold */
  history?: HistoryFlag[];
  yearMin?: number;
  yearMax?: number;
  priceMinCents?: number;
  priceMaxCents?: number;
  mileageMax?: number;
  seatsMin?: number;
  /** engine displacement in liters, one decimal (`2.0`) */
  engineMinL?: number;
  engineMaxL?: number;
  dealer?: string;
  sort?: InventorySort;
  page?: number;
}

export type FilterListKey = ListKey;
type ListKey =
  | 'make'
  | 'model'
  | 'body'
  | 'fuel'
  | 'drivetrain'
  | 'transmission'
  | 'condition'
  | 'color'
  | 'feature'
  | 'damage'
  | 'damageArea'
  | 'driveStatus'
  | 'title'
  | 'history';
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
  color: oneOf(E.color_family),
  feature: isSlug,
  damage: oneOf(E.damage_level),
  damageArea: oneOf(E.damage_area),
  driveStatus: oneOf(E.drive_status),
  title: oneOf(E.title_status),
  history: oneOf(HISTORY_FLAGS),
};

/** URL param name of each list filter (most match the filter key). */
const LIST_PARAM_NAMES: Record<ListKey, string> = {
  make: 'make',
  model: 'model',
  body: 'body',
  fuel: 'fuel',
  drivetrain: 'drivetrain',
  transmission: 'transmission',
  condition: 'condition',
  color: 'color',
  feature: 'feature',
  damage: 'damage',
  damageArea: 'damage_area',
  driveStatus: 'drive_status',
  title: 'title',
  history: 'history',
};

const NUMBER_PARAMS: Record<NumberKey, string> = {
  yearMin: 'year_min',
  yearMax: 'year_max',
  mileageMax: 'mileage_max',
  seatsMin: 'seats_min',
  page: 'page',
};

const PRICE_PARAMS = { priceMinCents: 'price_min', priceMaxCents: 'price_max' } as const;
const ENGINE_PARAMS = { engineMinL: 'engine_min', engineMaxL: 'engine_max' } as const;

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
  'damage',
  'damage_area',
  'drive_status',
  'title',
  'history',
  'year_min',
  'year_max',
  'price_min',
  'price_max',
  'mileage_max',
  'seats_min',
  'engine_min',
  'engine_max',
  'dealer',
  'sort',
  'page',
] as const;

const MAX_LIST_VALUES = 30;

/** Filter key → URL param name (e.g. `priceMaxCents` → `price_max`), for URL-state libraries. */
export const FILTER_PARAM_KEYS = {
  q: 'q',
  make: 'make',
  model: 'model',
  body: 'body',
  fuel: 'fuel',
  drivetrain: 'drivetrain',
  transmission: 'transmission',
  condition: 'condition',
  color: 'color',
  feature: 'feature',
  damage: 'damage',
  damageArea: 'damage_area',
  driveStatus: 'drive_status',
  title: 'title',
  history: 'history',
  ...NUMBER_PARAMS,
  ...PRICE_PARAMS,
  ...ENGINE_PARAMS,
  dealer: 'dealer',
  sort: 'sort',
} as const satisfies Record<keyof InventoryFilters, string>;

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

/** Liters with at most one decimal (`2`, `2.0`, `3.5`), between 0.1 and 99.9. */
function parseLiters(raw: string | null): number | undefined {
  if (raw === null || !/^\d{1,2}(\.\d)?$/.test(raw.trim())) return undefined;
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
      .getAll(LIST_PARAM_NAMES[key])
      .flatMap((raw: string) => raw.split(','))
      .map((v: string) => v.trim().toLowerCase())
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

  for (const [key, param] of Object.entries(ENGINE_PARAMS) as [
    keyof typeof ENGINE_PARAMS,
    string,
  ][]) {
    const liters = parseLiters(first(params, param));
    if (liters !== undefined) filters[key] = liters;
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
    if (values && values.length > 0) {
      entries.set(LIST_PARAM_NAMES[key], [...new Set<string>(values)].sort().join(','));
    }
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
  for (const [key, param] of Object.entries(ENGINE_PARAMS) as [
    keyof typeof ENGINE_PARAMS,
    string,
  ][]) {
    const liters = filters[key];
    if (liters !== undefined && liters > 0 && liters < 100) entries.set(param, liters.toFixed(1));
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
    'engineMinL',
    'engineMaxL',
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
/** Engine size steps (liters) for the min/max selects. */
export const ENGINE_STEPS_L = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0] as const;

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

type Dict = CoreDictionary;

const LIST_LABELS: Record<ListKey, (value: string, labels: FilterLabels, d: Dict) => string> = {
  make: (v, l) => l.make?.[v] ?? v,
  model: (v, l) => l.model?.[v] ?? v,
  body: (v, _, d) => d.bodyType[v as Enums<'body_type'>],
  fuel: (v, _, d) => d.fuelType[v as Enums<'fuel_type'>],
  drivetrain: (v, _, d) => d.drivetrain[v as Enums<'drivetrain'>],
  transmission: (v, _, d) => d.transmission[v as Enums<'transmission'>],
  condition: (v, _, d) => d.condition[v as Enums<'vehicle_condition'>],
  color: (v, _, d) => d.colorFamily[v as Enums<'color_family'>],
  feature: (v, l) => l.feature?.[v] ?? v,
  damage: (v, _, d) => d.damageLevel[v as Enums<'damage_level'>],
  damageArea: (v, _, d) => d.chip.damageArea(d.damageArea[v as Enums<'damage_area'>]),
  driveStatus: (v, _, d) => d.driveStatus[v as Enums<'drive_status'>],
  title: (v, _, d) => d.chip.title(d.titleStatus[v as Enums<'title_status'>]),
  history: (v, _, d) => d.historyFlag[v as HistoryFlag],
};

type ScalarKey =
  | 'q'
  | 'yearMin'
  | 'yearMax'
  | 'priceMinCents'
  | 'priceMaxCents'
  | 'mileageMax'
  | 'seatsMin'
  | 'engineMinL'
  | 'engineMaxL'
  | 'dealer';

const SCALAR_LABELS: Record<
  ScalarKey,
  (filters: InventoryFilters, labels: FilterLabels, d: Dict, locale?: Locale) => string
> = {
  q: (f) => `“${f.q ?? ''}”`,
  yearMin: (f, _, d) => d.chip.yearMin(f.yearMin ?? 0),
  yearMax: (f, _, d) => d.chip.yearMax(f.yearMax ?? 0),
  priceMinCents: (f, _, d) => d.chip.priceFrom(formatPrice(f.priceMinCents ?? 0)),
  priceMaxCents: (f, _, d) => d.chip.priceUpTo(formatPrice(f.priceMaxCents ?? 0)),
  mileageMax: (f, _, d, locale) => d.chip.mileageUnder(formatMileage(f.mileageMax ?? 0, locale)),
  seatsMin: (f, _, d) => d.chip.seatsMin(f.seatsMin ?? 0),
  engineMinL: (f, _, d) => d.chip.engineMin((f.engineMinL ?? 0).toFixed(1)),
  engineMaxL: (f, _, d) => d.chip.engineMax((f.engineMaxL ?? 0).toFixed(1)),
  dealer: (f, l) => l.dealer?.[f.dealer ?? ''] ?? f.dealer ?? '',
};

/** One removable chip per active refinement, in URL order. Sort and page are not chips. */
export function activeFilterChips(
  filters: InventoryFilters,
  labels: FilterLabels = {},
  locale?: Locale,
): FilterChip[] {
  const d = coreDictionary(locale);
  const { page: _page, ...base } = filters;
  const chips: FilterChip[] = [];
  if (base.q)
    chips.push({ id: 'q', label: SCALAR_LABELS.q(base, labels, d), next: omit(base, 'q') });
  for (const key of Object.keys(LIST_PARAMS) as ListKey[]) {
    for (const value of base[key] ?? []) {
      chips.push({
        id: `${key}:${value}`,
        label: LIST_LABELS[key](value, labels, d),
        next: toggleFilterValue(base, key, value as never),
      });
    }
  }
  for (const key of Object.keys(SCALAR_LABELS) as ScalarKey[]) {
    if (key === 'q' || base[key] === undefined) continue;
    chips.push({
      id: key,
      label: SCALAR_LABELS[key](base, labels, d, locale),
      next: omit(base, key),
    });
  }
  return chips;
}

/** "Clear all": drops every refinement but keeps the chosen sort. */
export function clearFilters(filters: InventoryFilters): InventoryFilters {
  return filters.sort ? { sort: filters.sort } : {};
}
