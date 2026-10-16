import { describe, expect, it } from 'vitest';

import { inventoryFacetsSchema, toFacetPayload } from './facets';

describe('toFacetPayload', () => {
  it('maps camelCase filters to the RPC keys and drops page/sort/undefined', () => {
    expect(
      toFacetPayload({
        make: ['bmw'],
        priceMaxCents: 4_000_000,
        yearMin: 2018,
        seatsMin: 7,
        damageArea: ['hail'],
        driveStatus: ['runs_and_drives'],
        engineMinL: 2,
        sort: 'price_asc',
        page: 3,
      }),
    ).toEqual({
      make: ['bmw'],
      price_max_cents: 4_000_000,
      year_min: 2018,
      seats_min: 7,
      damage_area: ['hail'],
      drive_status: ['runs_and_drives'],
      engine_min_l: 2,
    });
  });
});

describe('inventoryFacetsSchema', () => {
  it('parses an empty result', () => {
    const empty = {
      total: 0,
      ...Object.fromEntries(
        [
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
        ].map((k) => [k, []]),
      ),
      price: { min: null, max: null },
      year: { min: null, max: null },
      mileage: { min: null, max: null },
      engine: { min: null, max: null },
    };
    expect(inventoryFacetsSchema.parse(empty).total).toBe(0);
  });
});
