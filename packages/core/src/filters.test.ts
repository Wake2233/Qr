import { describe, expect, it } from 'vitest';

import {
  activeFilterChips,
  clearFilters,
  countActiveFilters,
  FILTER_PARAM_KEYS,
  MILEAGE_STEPS,
  PRICE_STEPS_CENTS,
  SORT_OPTIONS,
  sortLabels,
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

describe('activeFilterChips', () => {
  it('describes every refinement with readable labels and a removal target', () => {
    const filters = parseInventoryFilters(
      'q=x5&make=bmw&body=suv&fuel=plug_in_hybrid&price_min=20000&price_max=40000&year_min=2019&year_max=2023&mileage_max=50000&seats_min=7&dealer=garden-state&sort=price_asc&page=3',
    );
    const chips = activeFilterChips(filters, {
      make: { bmw: 'BMW' },
      dealer: { 'garden-state': 'Garden State Motors' },
    });
    expect(chips.map((c) => [c.id, c.label])).toEqual([
      ['q', '“x5”'],
      ['make:bmw', 'BMW'],
      ['body:suv', 'SUV'],
      ['fuel:plug_in_hybrid', 'Plug-in hybrid'],
      ['yearMin', '2019 or newer'],
      ['yearMax', '2023 or older'],
      ['priceMinCents', 'From $20,000'],
      ['priceMaxCents', 'Up to $40,000'],
      ['mileageMax', 'Under 50,000 mi'],
      ['seatsMin', '7+ seats'],
      ['dealer', 'Garden State Motors'],
    ]);
    const make = chips.find((c) => c.id === 'make:bmw');
    expect(make?.next.make).toBeUndefined();
    expect(make?.next.sort).toBe('price_asc');
    expect(chips.every((c) => c.next.page === undefined)).toBe(true);
  });

  it('falls back to slugs when no labels are known', () => {
    const chips = activeFilterChips({ model: ['x5'], feature: ['sunroof'], color: ['Black'] });
    expect(chips.map((c) => c.label)).toEqual(['x5', 'Black', 'sunroof']);
  });

  it('removes one value of a multi-select facet at a time', () => {
    const [audi] = activeFilterChips({ make: ['audi', 'bmw'] });
    expect(audi?.next).toEqual({ make: ['bmw'] });
  });

  it('labels every enum facet', () => {
    const labels = activeFilterChips({
      drivetrain: ['awd'],
      transmission: ['cvt'],
      condition: ['certified'],
    }).map((c) => c.label);
    expect(labels).toEqual(['All-wheel drive (AWD)', 'CVT', 'Certified pre-owned']);
  });

  it('has no chips without refinements', () => {
    expect(activeFilterChips({ sort: 'price_desc', page: 2 })).toEqual([]);
  });
});

describe('clearFilters', () => {
  it('keeps only the sort', () => {
    expect(clearFilters({ make: ['bmw'], sort: 'price_asc', page: 2 })).toEqual({
      sort: 'price_asc',
    });
    expect(clearFilters({ make: ['bmw'] })).toEqual({});
  });
});

describe('filter presets', () => {
  it('are ascending and labelled for every sort', () => {
    expect([...PRICE_STEPS_CENTS]).toEqual([...PRICE_STEPS_CENTS].sort((a, b) => a - b));
    expect([...MILEAGE_STEPS]).toEqual([...MILEAGE_STEPS].sort((a, b) => a - b));
    expect(Object.keys(sortLabels)).toEqual([...SORT_OPTIONS]);
  });
});

describe('FILTER_PARAM_KEYS', () => {
  it('maps every filter to the param that parse/serialize use', () => {
    const filters: Required<InventoryFilters> = {
      q: 'x5',
      make: ['bmw'],
      model: ['x5'],
      body: ['suv'],
      fuel: ['diesel'],
      drivetrain: ['awd'],
      transmission: ['manual'],
      condition: ['used'],
      color: ['Black'],
      feature: ['sunroof'],
      yearMin: 2019,
      yearMax: 2023,
      priceMinCents: 1_000_000,
      priceMaxCents: 4_000_000,
      mileageMax: 50_000,
      seatsMin: 5,
      dealer: 'garden-state',
      sort: 'price_asc',
      page: 2,
    };
    const params = serializeInventoryFilters(filters);
    for (const [key, param] of Object.entries(FILTER_PARAM_KEYS)) {
      const single = serializeInventoryFilters({
        [key]: filters[key as keyof InventoryFilters],
      } as InventoryFilters);
      expect(single[param]).toBe(params[param]);
      expect(
        parseInventoryFilters({ [param]: params[param] })[key as keyof InventoryFilters],
      ).toEqual(filters[key as keyof InventoryFilters]);
    }
  });
});
