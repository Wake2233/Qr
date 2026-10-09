import { describe, expect, it } from 'vitest';

import { maxModelYear, vehiclePublishableSchema, vehicleUpsertSchema } from './vehicle';

const base = {
  dealer_id: '00000000-0000-4000-8000-000000000001',
  make_id: 3,
  model_id: 15,
  year: 2021,
};

const complete = {
  ...base,
  price_cents: 4_599_000,
  mileage: 32_410,
  body_type: 'suv',
  fuel_type: 'gasoline',
  drivetrain: 'awd',
  transmission: 'automatic',
  exterior_color: 'Jet Black',
  image_count: 3,
} as const;

describe('vehicleUpsertSchema', () => {
  it('accepts a minimal draft and applies defaults', () => {
    const parsed = vehicleUpsertSchema.parse({ ...base, trim: '  ', vin: '' });
    expect(parsed).toMatchObject({
      condition: 'used',
      title_status: 'clean',
      trim: null,
      vin: null,
      feature_ids: [],
    });
  });

  it('normalizes the VIN and rejects bad values', () => {
    expect(vehicleUpsertSchema.parse({ ...base, vin: '5uxcr6c05l9b12345' }).vin).toBe(
      '5UXCR6C05L9B12345',
    );
    expect(vehicleUpsertSchema.safeParse({ ...base, vin: 'SHORT' }).success).toBe(false);
  });

  it.each([
    { price_cents: 4599.5 },
    { price_cents: 0 },
    { mileage: -1 },
    { year: 1900 },
    { body_type: 'spaceship' },
    { displacement_l: 3.25 },
    { seats: 40 },
  ])('rejects %o', (patch) => {
    expect(vehicleUpsertSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });

  it('accepts one-decimal displacement', () => {
    expect(vehicleUpsertSchema.parse({ ...base, displacement_l: 3.0 }).displacement_l).toBe(3);
  });
});

describe('vehiclePublishableSchema', () => {
  it('passes a complete listing with photos', () => {
    expect(vehiclePublishableSchema.safeParse(complete).success).toBe(true);
  });

  it('reports every missing publish field by path', () => {
    const result = vehiclePublishableSchema.safeParse({ ...base, image_count: 0 });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path.join('.')).sort();
    expect(paths).toEqual(
      [
        'body_type',
        'drivetrain',
        'exterior_color',
        'fuel_type',
        'image_count',
        'mileage',
        'price_cents',
        'transmission',
      ].sort(),
    );
  });

  it('rejects years beyond next model year', () => {
    const result = vehiclePublishableSchema.safeParse({ ...complete, year: maxModelYear() + 1 });
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(['year']);
  });

  it('computes next model year from a date', () => {
    expect(maxModelYear(new Date('2026-10-09'))).toBe(2027);
  });
});

describe('vehicle price sanity cap', () => {
  it('rejects prices above $10M (typo guard) but allows exotic-car prices', async () => {
    const { vehicleUpsertSchema } = await import('./vehicle');
    const base = {
      dealer_id: '00000000-0000-4000-8000-000000000001',
      make_id: 1,
      model_id: 1,
      year: 2022,
    };
    expect(vehicleUpsertSchema.safeParse({ ...base, price_cents: 240_902_359_000 }).success).toBe(
      false,
    );
    expect(vehicleUpsertSchema.safeParse({ ...base, price_cents: 350_000_000 }).success).toBe(true);
  });
});
