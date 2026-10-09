import { assertEquals } from 'jsr:@std/assert@1';

import { BMW_X5_2021, TESLA_MODEL_3, TOYOTA_PRIUS_PRIME, UNDECODABLE } from './fixtures.ts';
import { isUndecodable, mapVpicResult, slugify, titleCaseMake } from './map.ts';

Deno.test('maps a clean BMW decode onto vehicle columns', () => {
  assertEquals(mapVpicResult(BMW_X5_2021), {
    year: 2021,
    make: 'BMW',
    model: 'X5',
    trim: 'xDrive40i',
    body_type: 'suv',
    fuel_type: 'gasoline',
    drivetrain: 'awd',
    transmission: 'automatic',
    engine: '3.0L 6-cylinder turbo (B58B30O1)',
    cylinders: 6,
    displacement_l: 3,
    horsepower: 335,
    doors: 4,
    seats: 5,
    warnings: [],
  });
});

Deno.test('detects plug-in hybrids, CVTs and hatchbacks', () => {
  const decoded = mapVpicResult(TOYOTA_PRIUS_PRIME);
  assertEquals(decoded.make, 'Toyota');
  assertEquals(decoded.fuel_type, 'plug_in_hybrid');
  assertEquals(decoded.transmission, 'cvt');
  assertEquals(decoded.body_type, 'hatchback');
  assertEquals(decoded.displacement_l, 1.8);
  assertEquals(decoded.seats, null);
});

Deno.test('detects EVs and leaves engine fields empty', () => {
  const decoded = mapVpicResult(TESLA_MODEL_3);
  assertEquals(decoded.fuel_type, 'electric');
  assertEquals(decoded.drivetrain, 'rwd');
  assertEquals(decoded.body_type, 'sedan');
  assertEquals(decoded.cylinders, null);
  assertEquals(decoded.engine, null);
  assertEquals(decoded.transmission, null);
});

Deno.test('maps the remaining body, fuel, drive and gearbox variants', () => {
  const cases: [Record<string, string>, keyof ReturnType<typeof mapVpicResult>, string | null][] = [
    [{ BodyClass: 'Minivan' }, 'body_type', 'minivan'],
    [{ BodyClass: 'Cargo Van' }, 'body_type', 'van'],
    [{ BodyClass: 'Pickup' }, 'body_type', 'pickup'],
    [{ BodyClass: 'Crossover Utility Vehicle (CUV)' }, 'body_type', 'suv'],
    [{ BodyClass: 'Convertible/Cabriolet' }, 'body_type', 'convertible'],
    [{ BodyClass: 'Coupe' }, 'body_type', 'coupe'],
    [{ BodyClass: 'Wagon' }, 'body_type', 'wagon'],
    [{ BodyClass: 'Bus' }, 'body_type', null],
    [{ FuelTypePrimary: 'Diesel' }, 'fuel_type', 'diesel'],
    [{ FuelTypePrimary: 'Flexible Fuel Vehicle (FFV)' }, 'fuel_type', 'flex_fuel'],
    [{ FuelTypePrimary: 'Gasoline', ElectrificationLevel: 'Strong HEV' }, 'fuel_type', 'hybrid'],
    [{ DriveType: '4WD/4-Wheel Drive/4x4' }, 'drivetrain', '4wd'],
    [{ DriveType: 'FWD/Front-Wheel Drive' }, 'drivetrain', 'fwd'],
    [{ DriveType: '4x2' }, 'drivetrain', null],
    [{ TransmissionStyle: 'Manual/Standard' }, 'transmission', 'manual'],
    [{ TransmissionStyle: 'Dual-Clutch Transmission (DCT)' }, 'transmission', 'dct'],
  ];
  for (const [input, field, expected] of cases) {
    assertEquals(mapVpicResult(input)[field], expected, JSON.stringify(input));
  }
});

Deno.test('keeps vPIC warnings for soft errors', () => {
  const decoded = mapVpicResult({
    ...BMW_X5_2021,
    ErrorCode: '1',
    ErrorText: '1 - Check Digit (9th position) does not calculate properly',
  });
  assertEquals(decoded.warnings, ['1 - Check Digit (9th position) does not calculate properly']);
  assertEquals(isUndecodable({ ...BMW_X5_2021, ErrorCode: '1' }), false);
});

Deno.test('flags undecodable VINs', () => {
  assertEquals(isUndecodable(UNDECODABLE), true);
  assertEquals(isUndecodable(BMW_X5_2021), false);
});

Deno.test('title-cases makes but keeps acronyms', () => {
  assertEquals(titleCaseMake('MERCEDES-BENZ'), 'Mercedes-Benz');
  assertEquals(titleCaseMake('LAND ROVER'), 'Land Rover');
  assertEquals(titleCaseMake('GMC'), 'GMC');
  assertEquals(slugify('Mercedes-Benz'), 'mercedes-benz');
  assertEquals(slugify('3 Series'), '3-series');
});
