import { describe, expect, it } from 'vitest';

import {
  groupFeatures,
  groupVehicleSpecs,
  priceDropCents,
  vehicleImageAlt,
  vehicleSlug,
  vehicleTitle,
  type VehicleSpecSource,
} from './vehicle';

const x5: VehicleSpecSource = {
  year: 2021,
  make: 'BMW',
  model: 'X5',
  trim: 'xDrive40i',
  condition: 'used',
  mileage: 32_410,
  price_cents: 4_599_000,
  msrp_cents: 6_270_000,
  stock_number: 'A123',
  vin: '5UXCR6C05L9B12345',
  body_type: 'suv',
  exterior_color: 'Jet Black',
  interior_color: 'Cognac',
  doors: 4,
  seats: 5,
  fuel_type: 'gasoline',
  drivetrain: 'awd',
  transmission: 'automatic',
  engine: '3.0L Turbo I6',
  cylinders: 6,
  displacement_l: 3,
  horsepower: 335,
  torque_lbft: 330,
  mpg_city: 21,
  mpg_highway: 26,
  ev_range_mi: null,
  owners_count: 1,
  accident_free: true,
  title_status: 'clean',
};

describe('vehicleTitle', () => {
  it('joins year, make, model and trim', () => {
    expect(vehicleTitle(x5)).toBe('2021 BMW X5 xDrive40i');
    expect(vehicleTitle({ year: 2020, make: 'Tesla', model: 'Model 3', trim: '  ' })).toBe(
      '2020 Tesla Model 3',
    );
  });
});

describe('vehicleSlug', () => {
  it('matches the database trigger format', () => {
    expect(vehicleSlug({ ...x5, id: '1a2b3c4d-0000-4000-8000-000000000000' })).toBe(
      '2021-bmw-x5-xdrive40i-1a2b3c4d',
    );
    expect(
      vehicleSlug({
        year: 2022,
        make: 'Mercedes-Benz',
        model: 'GLE 350',
        trim: null,
        id: 'ffeeddcc-1',
      }),
    ).toBe('2022-mercedes-benz-gle-350-ffeeddcc');
  });
});

describe('groupVehicleSpecs', () => {
  it('renders every non-null field exactly once, in four groups', () => {
    const groups = groupVehicleSpecs(x5);
    expect(groups.map((g) => g.title)).toEqual([
      'Overview',
      'Powertrain',
      'Body & Interior',
      'History',
    ]);
    const values = Object.fromEntries(groups.flatMap((g) => g.rows).map((r) => [r.key, r.value]));
    expect(values).toMatchObject({
      price_cents: '$45,990',
      msrp_cents: '$62,700',
      mileage: '32,410 mi',
      displacement_l: '3.0 L',
      horsepower: '335 hp',
      torque_lbft: '330 lb-ft',
      mpg: '21 city / 26 hwy mpg',
      drivetrain: 'All-wheel drive (AWD)',
      body_type: 'SUV',
      owners_count: '1',
      accident_free: 'No accidents reported',
      title_status: 'Clean',
    });
    expect(values).not.toHaveProperty('ev_range_mi');
    const keys = groups.flatMap((g) => g.rows.map((r) => r.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('drops empty groups and handles partial data', () => {
    const groups = groupVehicleSpecs({
      ...x5,
      trim: null,
      mileage: null,
      price_cents: null,
      msrp_cents: null,
      stock_number: null,
      vin: null,
      body_type: null,
      exterior_color: null,
      interior_color: null,
      doors: null,
      seats: null,
      fuel_type: 'electric',
      drivetrain: null,
      transmission: null,
      engine: null,
      cylinders: null,
      displacement_l: null,
      horsepower: null,
      torque_lbft: null,
      mpg_city: null,
      mpg_highway: 120,
      ev_range_mi: 300,
      owners_count: 0,
      accident_free: false,
    });
    expect(groups.map((g) => g.id)).toEqual(['overview', 'powertrain', 'history']);
    const values = Object.fromEntries(groups.flatMap((g) => g.rows).map((r) => [r.key, r.value]));
    expect(values).toMatchObject({
      mpg: '120 hwy mpg',
      ev_range_mi: '300 mi',
      owners_count: 'None',
      accident_free: 'Accident reported',
    });
    expect(
      Object.fromEntries(
        groupVehicleSpecs({ ...x5, mpg_highway: null })
          .flatMap((g) => g.rows)
          .map((r) => [r.key, r.value]),
      ).mpg,
    ).toBe('21 city mpg');
    expect(
      groupVehicleSpecs({ ...x5, mpg_city: null, mpg_highway: null })
        .flatMap((g) => g.rows)
        .some((r) => r.key === 'mpg'),
    ).toBe(false);
  });
});

describe('groupFeatures', () => {
  it('groups by category in display order and sorts names', () => {
    expect(
      groupFeatures([
        { name: 'Sunroof', category: 'exterior' },
        { name: 'Lane keep assist', category: 'safety' },
        { name: 'Blind spot monitor', category: 'safety' },
        { name: 'Apple CarPlay', category: 'technology' },
      ]),
    ).toEqual([
      { category: 'safety', title: 'Safety', features: ['Blind spot monitor', 'Lane keep assist'] },
      { category: 'technology', title: 'Technology', features: ['Apple CarPlay'] },
      { category: 'exterior', title: 'Exterior', features: ['Sunroof'] },
    ]);
  });
});

describe('priceDropCents', () => {
  it('returns the drop only for decreases', () => {
    expect(priceDropCents(4_799_000, 4_599_000)).toBe(200_000);
    expect(priceDropCents(4_399_000, 4_599_000)).toBeNull();
    expect(priceDropCents(null, 4_599_000)).toBeNull();
    expect(priceDropCents(4_599_000, undefined)).toBeNull();
  });
});

describe('vehicleImageAlt', () => {
  it('uses the view or a numbered fallback', () => {
    expect(vehicleImageAlt('2021 BMW X5', 'interior', 2)).toBe('2021 BMW X5 – interior');
    expect(vehicleImageAlt('2021 BMW X5', null, 2)).toBe('2021 BMW X5 – photo 3');
  });
});
