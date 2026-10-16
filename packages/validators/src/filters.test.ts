import { parseInventoryFilters } from '@cp/core';
import { describe, expect, it } from 'vitest';

import { inventoryFiltersSchema } from './filters';

describe('inventoryFiltersSchema', () => {
  it('accepts anything the URL parser produces', () => {
    const parsed = parseInventoryFilters(
      'make=bmw&body=suv&price_min=10000&price_max=40000&year_min=2018&sort=price_asc&page=2' +
        '&color=white&damage=none&drive_status=runs_and_drives&history=one_owner&engine_min=2.0',
    );
    expect(inventoryFiltersSchema.parse(parsed)).toEqual(parsed);
  });

  it('rejects unknown keys and enum values', () => {
    expect(inventoryFiltersSchema.safeParse({ colour: ['red'] }).success).toBe(false);
    expect(inventoryFiltersSchema.safeParse({ fuel: ['steam'] }).success).toBe(false);
    expect(inventoryFiltersSchema.safeParse({ color: ['Jet Black'] }).success).toBe(false);
    expect(inventoryFiltersSchema.safeParse({ history: ['no_rust'] }).success).toBe(false);
  });

  it('rejects inverted ranges', () => {
    expect(inventoryFiltersSchema.safeParse({ yearMin: 2024, yearMax: 2020 }).success).toBe(false);
    expect(
      inventoryFiltersSchema.safeParse({ priceMinCents: 5_000_000, priceMaxCents: 1_000_000 })
        .success,
    ).toBe(false);
    expect(inventoryFiltersSchema.safeParse({ engineMinL: 4, engineMaxL: 2 }).success).toBe(false);
  });
});
