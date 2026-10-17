import { describe, expect, it } from 'vitest';

import { buildCompareSections } from '../compare';
import { activeFilterChips, sortLabels } from '../filters';
import { formatMileage } from '../format';
import { conditionBadges, groupFeatures, vehicleImageAlt, vehicleSpecGrid } from '../vehicle';
import { en } from './en';
import { coreDictionary, featureName, isLocale, LOCALES } from './index';
import { ka } from './ka';

const car = {
  year: 2021,
  make: 'BMW',
  model: 'X5',
  trim: null,
  condition: 'used',
  mileage: 32_410,
  price_cents: 4_599_000,
  msrp_cents: null,
  stock_number: null,
  vin: null,
  body_type: 'suv',
  exterior_color: null,
  interior_color: null,
  doors: null,
  seats: null,
  fuel_type: 'hybrid',
  drivetrain: null,
  transmission: null,
  engine: null,
  cylinders: null,
  displacement_l: null,
  horsepower: 335,
  torque_lbft: null,
  mpg_city: 21,
  mpg_highway: null,
  ev_range_mi: null,
  owners_count: 1,
  accident_free: true,
  title_status: 'clean',
  drive_status: 'runs_and_drives',
} as const;

/** Every string leaf (functions are called with sample arguments). */
function leaves(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (typeof value === 'function')
    return [[path, String((value as (...a: never[]) => unknown)(...([1, 2] as never[])))]];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    leaves(v, path ? `${path}.${k}` : k),
  );
}

describe('core dictionaries', () => {
  it('has a Georgian string for every English key', () => {
    const enPaths = leaves(en).map(([p]) => p);
    const kaLeaves = leaves(ka);
    expect(kaLeaves.map(([p]) => p)).toEqual(enPaths);
    for (const [path, text] of kaLeaves) expect(text.trim(), path).not.toBe('');
  });

  it('picks the dictionary by locale (English by default)', () => {
    expect(coreDictionary()).toBe(en);
    expect(coreDictionary('ka')).toBe(ka);
    expect(LOCALES).toEqual(['en', 'ka']);
    expect(isLocale('ka')).toBe(true);
    expect(isLocale('de')).toBe(false);
  });

  it('keeps the English exports unchanged', () => {
    expect(sortLabels.price_asc).toBe('Price: low to high');
  });
});

describe('Georgian rendering', () => {
  it('labels spec rows and values', () => {
    const [overview, powertrain, body, history] = vehicleSpecGrid(car, 'ka');
    expect(overview?.title).toBe('მიმოხილვა');
    expect(overview?.rows.find((r) => r.key === 'mileage')).toEqual({
      key: 'mileage',
      label: 'გარბენი',
      value: '32,410 მილი',
    });
    expect(overview?.rows.find((r) => r.key === 'price_cents')?.value).toBe('$45,990');
    expect(powertrain?.rows.find((r) => r.key === 'fuel_type')?.value).toBe('ჰიბრიდი');
    expect(powertrain?.rows.find((r) => r.key === 'horsepower')?.value).toBe('335 ც.ძ.');
    expect(powertrain?.rows.find((r) => r.key === 'mpg')?.value).toBe('21 ქალაქში (mpg)');
    expect(body?.rows.find((r) => r.key === 'body_type')?.value).toBe('ჯიპი (SUV)');
    expect(history?.rows.find((r) => r.key === 'accident_free')?.value).toBe(
      'ავარია არ დაფიქსირებულა',
    );
  });

  it('labels badges, chips, features, compare and photos', () => {
    expect(conditionBadges(car, 'ka').map((b) => b.label)).toEqual([
      'იქოქება და დადის (Run & Drive)',
      'სუფთა თაითლი',
      '1 მფლობელი',
      'ავარიის გარეშე',
    ]);
    expect(
      activeFilterChips({ body: ['suv'], yearMin: 2018, mileageMax: 50_000 }, {}, 'ka').map(
        (c) => c.label,
      ),
    ).toEqual(['ჯიპი (SUV)', '2018 წლიდან', '50,000 მილი-მდე']);
    expect(groupFeatures([{ name: 'Heated seats', category: 'comfort' }], 'ka')[0]?.title).toBe(
      'კომფორტი',
    );
    expect(
      buildCompareSections([{ ...car, features: [{ name: 'Sunroof' }] }], 'ka').at(-1)?.title,
    ).toBe('აღჭურვილობა');
    expect(vehicleImageAlt('2021 BMW X5', null, 0, 'ka')).toBe('2021 BMW X5 – ფოტო 1');
    expect(formatMileage(1200, 'ka')).toBe('1,200 მილი');
    expect(formatMileage(1200)).toBe('1,200 mi');
  });
});

describe('featureName', () => {
  it('translates catalog features by slug and falls back to the English name', () => {
    const acc = {
      slug: 'adaptive-cruise-control',
      name: 'Adaptive Cruise Control (DISTRONIC, ACC)',
    };
    expect(featureName(acc, 'ka')).toBe('ადაპტური კრუიზ-კონტროლი (DISTRONIC, ACC)');
    expect(featureName(acc, 'en')).toBe(acc.name);
    expect(featureName({ slug: 'brand-new-thing', name: 'Brand New Thing' }, 'ka')).toBe(
      'Brand New Thing',
    );
  });
});
