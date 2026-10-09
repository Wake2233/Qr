/**
 * Compare table model shared by the web /compare page and the mobile compare screen.
 * Columns are vehicles; rows are spec fields and features. A row "differs" when the
 * vehicles don't all show the same value, which drives highlighting and "hide identical".
 */
import type { Tables } from '@cp/types';

import { vehicleSpecGrid, type VehicleSpecSource } from './vehicle';

export interface CompareInput extends VehicleSpecSource {
  features: Pick<Tables<'features'>, 'name'>[];
}

export interface CompareRow {
  key: string;
  label: string;
  /** One value per vehicle, in column order; null = not listed. */
  values: (string | null)[];
  differs: boolean;
}

export interface CompareSection {
  id: string;
  title: string;
  rows: CompareRow[];
}

/** Spec keys shown in the sticky column headers instead of as rows. */
const HEADER_KEYS = new Set(['year', 'make', 'model', 'trim', 'price_cents']);

export const FEATURE_INCLUDED = 'Included';

const differs = (values: (string | null)[]) =>
  values.length > 1 && new Set(values.map((v) => v ?? '')).size > 1;

export function buildCompareSections(vehicles: readonly CompareInput[]): CompareSection[] {
  if (vehicles.length === 0) return [];
  const grids = vehicles.map(vehicleSpecGrid);
  const [first] = grids;
  if (!first) return [];

  const specSections = first.map((group, groupIndex) => ({
    id: group.id,
    title: group.title,
    rows: group.rows.flatMap((cell, rowIndex) => {
      if (HEADER_KEYS.has(cell.key)) return [];
      const values = grids.map((grid) => grid[groupIndex]?.rows[rowIndex]?.value ?? null);
      if (values.every((v) => v === null)) return [];
      return [{ key: cell.key, label: cell.label, values, differs: differs(values) }];
    }),
  }));

  const featureNames = [...new Set(vehicles.flatMap((v) => v.features.map((f) => f.name)))].sort(
    (a, b) => a.localeCompare(b),
  );
  const featureSection: CompareSection = {
    id: 'features',
    title: 'Features',
    rows: featureNames.map((name) => {
      const values = vehicles.map((v) =>
        v.features.some((f) => f.name === name) ? FEATURE_INCLUDED : null,
      );
      return { key: `feature:${name}`, label: name, values, differs: differs(values) };
    }),
  };

  return [...specSections, featureSection].filter((section) => section.rows.length > 0);
}

/** Keeps only rows where the vehicles differ ("Hide identical"). */
export function onlyDifferences(sections: readonly CompareSection[]): CompareSection[] {
  return sections
    .map((section) => ({ ...section, rows: section.rows.filter((row) => row.differs) }))
    .filter((section) => section.rows.length > 0);
}

/** `/compare?ids=a,b,c` (ids order = column order). */
export function compareHref(ids: readonly string[], pathname = '/compare'): string {
  return ids.length > 0 ? `${pathname}?ids=${ids.join(',')}` : pathname;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parses `?ids=` leniently: valid UUIDs only, de-duplicated, capped at `max`. */
export function parseCompareIds(raw: string | string[] | null | undefined, max = 4): string[] {
  const values = (Array.isArray(raw) ? raw : [raw ?? ''])
    .flatMap((v) => v.split(','))
    .map((v) => v.trim().toLowerCase())
    .filter((v) => UUID.test(v));
  return [...new Set(values)].slice(0, max);
}
