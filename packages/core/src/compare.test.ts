import { describe, expect, it } from 'vitest';

import {
  buildCompareSections,
  compareHref,
  FEATURE_INCLUDED,
  onlyDifferences,
  parseCompareIds,
  type CompareInput,
} from './compare';

const x5: CompareInput = {
  year: 2021,
  make: 'BMW',
  model: 'X5',
  trim: 'xDrive40i',
  condition: 'used',
  mileage: 32_410,
  price_cents: 4_599_000,
  msrp_cents: null,
  stock_number: 'A123',
  vin: null,
  body_type: 'suv',
  exterior_color: 'Black',
  interior_color: null,
  doors: 4,
  seats: 5,
  fuel_type: 'gasoline',
  drivetrain: 'awd',
  transmission: 'automatic',
  engine: null,
  cylinders: null,
  displacement_l: null,
  horsepower: 335,
  torque_lbft: null,
  mpg_city: null,
  mpg_highway: null,
  ev_range_mi: null,
  owners_count: null,
  accident_free: null,
  title_status: 'clean',
  features: [{ name: 'Sunroof' }, { name: 'Heated seats' }],
};

const q5: CompareInput = {
  ...x5,
  make: 'Audi',
  model: 'Q5',
  mileage: 18_000,
  stock_number: 'B7',
  horsepower: null,
  ev_range_mi: null,
  features: [{ name: 'Heated seats' }],
};

const rowOf = (sections: ReturnType<typeof buildCompareSections>, key: string) =>
  sections.flatMap((s) => s.rows).find((r) => r.key === key);

describe('buildCompareSections', () => {
  const sections = buildCompareSections([x5, q5]);

  it('keeps the shared spec group order and ends with features', () => {
    expect(sections.map((s) => s.id)).toEqual([
      'overview',
      'powertrain',
      'body_interior',
      'history',
      'features',
    ]);
  });

  it('puts title and price in the column headers, not rows', () => {
    for (const key of ['year', 'make', 'model', 'trim', 'price_cents']) {
      expect(rowOf(sections, key)).toBeUndefined();
    }
  });

  it('aligns values per vehicle and flags differences', () => {
    expect(rowOf(sections, 'mileage')).toEqual({
      key: 'mileage',
      label: 'Mileage',
      values: ['32,410 mi', '18,000 mi'],
      differs: true,
    });
    expect(rowOf(sections, 'body_type')?.differs).toBe(false);
  });

  it('keeps a row when only some vehicles list it (empty cells are null)', () => {
    expect(rowOf(sections, 'horsepower')?.values).toEqual(['335 hp', null]);
    expect(rowOf(sections, 'horsepower')?.differs).toBe(true);
  });

  it('drops rows no vehicle lists', () => {
    expect(rowOf(sections, 'ev_range_mi')).toBeUndefined();
    expect(rowOf(sections, 'vin')).toBeUndefined();
  });

  it('lists the union of features, sorted', () => {
    const features = sections.find((s) => s.id === 'features');
    expect(features?.rows.map((r) => [r.label, r.values, r.differs])).toEqual([
      ['Heated seats', [FEATURE_INCLUDED, FEATURE_INCLUDED], false],
      ['Sunroof', [FEATURE_INCLUDED, null], true],
    ]);
  });

  it('never flags differences with a single vehicle', () => {
    expect(
      buildCompareSections([x5])
        .flatMap((s) => s.rows)
        .some((r) => r.differs),
    ).toBe(false);
  });

  it('returns nothing for no vehicles', () => {
    expect(buildCompareSections([])).toEqual([]);
  });
});

describe('onlyDifferences', () => {
  it('removes identical rows and empty sections', () => {
    const diff = onlyDifferences(buildCompareSections([x5, q5]));
    expect(diff.flatMap((s) => s.rows).every((r) => r.differs)).toBe(true);
    expect(diff.map((s) => s.id)).not.toContain('history');
  });
});

describe('compare ids', () => {
  const a = '0b8f0a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
  const b = '1b8f0a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';

  it('builds a shareable href', () => {
    expect(compareHref([a, b])).toBe(`/compare?ids=${a},${b}`);
    expect(compareHref([])).toBe('/compare');
  });

  it('parses leniently: valid, unique, capped', () => {
    expect(parseCompareIds(`${a},nope,${a.toUpperCase()}, ${b}`)).toEqual([a, b]);
    expect(parseCompareIds([a, b], 1)).toEqual([a]);
    expect(parseCompareIds(null)).toEqual([]);
    expect(parseCompareIds(undefined)).toEqual([]);
  });
});
