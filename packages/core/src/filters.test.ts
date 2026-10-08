import { describe, expect, it } from 'vitest';

import {
  countActiveFilters,
  inventoryHref,
  inventoryQueryString,
  parseInventoryFilters,
  serializeInventoryFilters,
  toggleFilterValue,
  type InventoryFilters,
} from './filters';

// Core targets plain ES (no DOM lib); tests run on Node, where URLSearchParams exists.
declare const URLSearchParams: new (init: string) => { getAll(key: string): string[] };

const full: InventoryFilters = {
  q: 'xdrive',
  make: ['audi', 'bmw'],
  model: ['x5'],
  body: ['sedan', 'suv'],
  fuel: ['hybrid'],
  drivetrain: ['awd'],
  transmission: ['automatic'],
  condition: ['certified', 'used'],
  color: ['Jet Black'],
  feature: ['apple-carplay'],
  yearMin: 2018,
  yearMax: 2024,
  priceMinCents: 1_000_000,
  priceMaxCents: 4_500_000,
  mileageMax: 60_000,
  seatsMin: 5,
  dealer: 'garden-state-auto',
  sort: 'price_asc',
  page: 3,
};

describe('filters round-trip', () => {
  it('parse(serialize(f)) === f for every field', () => {
    expect(parseInventoryFilters(serializeInventoryFilters(full))).toEqual(full);
    expect(parseInventoryFilters(inventoryQueryString(full))).toEqual(full);
  });

  it('round-trips empty filters to an empty query', () => {
    expect(inventoryQueryString({})).toBe('');
    expect(parseInventoryFilters('')).toEqual({});
  });

  it('produces a canonical, readable query string', () => {
    expect(
      inventoryQueryString({ make: ['bmw', 'audi'], priceMaxCents: 4_000_000, q: 'a b' }),
    ).toBe('q=a%20b&make=audi,bmw&price_max=40000');
  });
});

describe('parseInventoryFilters', () => {
  it('accepts repeated keys, mixed case and a leading "?"', () => {
    expect(parseInventoryFilters('?make=BMW&make=audi,bmw&body=suv')).toEqual({
      make: ['audi', 'bmw'],
      body: ['suv'],
    });
  });

  it('accepts Next.js searchParams records and URLSearchParams', () => {
    expect(
      parseInventoryFilters({ make: ['bmw', 'audi'], sort: 'year_desc', x: undefined }),
    ).toEqual({
      make: ['audi', 'bmw'],
      sort: 'year_desc',
    });
    expect(parseInventoryFilters(new URLSearchParams('fuel=electric&page=2'))).toEqual({
      fuel: ['electric'],
      page: 2,
    });
  });

  it('drops invalid values instead of throwing', () => {
    expect(
      parseInventoryFilters(
        'body=spaceship&make=not%20a%20slug&price_max=-5&year_min=abc&sort=random&page=1&dealer=%25%25&q=%E0%A4%A',
      ),
    ).toEqual({ q: '%E0%A4%A' });
  });

  it('defaults are omitted (newest sort, page 1)', () => {
    expect(parseInventoryFilters('sort=newest&page=1')).toEqual({});
  });

  it('decodes "+" as a space', () => {
    expect(parseInventoryFilters('color=Jet+Black')).toEqual({ color: ['Jet Black'] });
  });

  it('ignores pairs without a value and empty segments', () => {
    expect(parseInventoryFilters('make&&fuel=diesel')).toEqual({ fuel: ['diesel'] });
  });
});

describe('inventoryHref', () => {
  it('returns the bare pathname without filters', () => {
    expect(inventoryHref({})).toBe('/inventory');
    expect(inventoryHref({ fuel: ['electric'] }, '/dealers/x')).toBe('/dealers/x?fuel=electric');
  });
});

describe('toggleFilterValue', () => {
  it('adds and removes values and resets the page', () => {
    const added = toggleFilterValue({ make: ['bmw'], page: 4 }, 'make', 'audi');
    expect(added).toEqual({ make: ['audi', 'bmw'] });
    expect(toggleFilterValue(added, 'make', 'audi')).toEqual({ make: ['bmw'] });
    expect(toggleFilterValue({ make: ['bmw'], fuel: ['diesel'] }, 'make', 'bmw')).toEqual({
      fuel: ['diesel'],
    });
  });
});

describe('countActiveFilters', () => {
  it('counts each list value and each range, but not sort/page', () => {
    expect(countActiveFilters({})).toBe(0);
    expect(countActiveFilters(full)).toBe(1 + 2 + 1 + 2 + 1 + 1 + 1 + 2 + 1 + 1 + 7);
  });
});
