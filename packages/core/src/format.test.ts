import { describe, expect, it } from 'vitest';

import {
  centsToDollarInput,
  formatApr,
  formatMileage,
  formatPhone,
  formatPrice,
  parseDollarsToCents,
} from './format';

describe('formatPrice', () => {
  it('formats whole-dollar cents without decimals', () => {
    expect(formatPrice(4_599_000)).toBe('$45,990');
  });

  it('keeps cents when present', () => {
    expect(formatPrice(4_599_050)).toBe('$45,990.50');
  });

  it('rejects non-integer cents', () => {
    expect(() => formatPrice(10.5)).toThrow(TypeError);
  });

  it('supports other currencies', () => {
    expect(formatPrice(150_000, { currency: 'CAD', locale: 'en-CA' })).toBe('$1,500');
  });
});

describe('formatMileage', () => {
  it('adds thousands separators and unit', () => {
    expect(formatMileage(42_180)).toBe('42,180 mi');
  });
});

describe('formatApr', () => {
  it.each([
    [650, '6.50%'],
    [1999, '19.99%'],
    [0, '0.00%'],
  ])('%i → %s', (bps, expected) => {
    expect(formatApr(bps)).toBe(expected);
  });

  it('rejects fractional basis points', () => {
    expect(() => formatApr(6.5)).toThrow(TypeError);
  });
});

describe('formatPhone', () => {
  it('formats North American numbers', () => {
    expect(formatPhone('+13473700570')).toBe('+1 (347) 370-0570');
  });

  it('leaves other numbers as E.164', () => {
    expect(formatPhone('+995599123456')).toBe('+995599123456');
  });
});

describe('parseDollarsToCents', () => {
  it.each([
    ['45990', 4599000],
    ['$45,990', 4599000],
    [' 45,990.5 ', 4599050],
    ['0.99', 99],
    ['12.34', 1234],
  ])('%s → %i', (input, cents) => {
    expect(parseDollarsToCents(input)).toBe(cents);
  });

  it.each(['', 'abc', '1.234', '-5', '1e5', '99999999999999999'])('rejects %j', (input) => {
    expect(parseDollarsToCents(input)).toBeNull();
  });
});

describe('centsToDollarInput', () => {
  it('round-trips with parseDollarsToCents', () => {
    for (const cents of [4599000, 4599050, 99, 1]) {
      expect(parseDollarsToCents(centsToDollarInput(cents))).toBe(cents);
    }
    expect(centsToDollarInput(4599000)).toBe('45990');
    expect(centsToDollarInput(4599005)).toBe('45990.05');
    expect(centsToDollarInput(null)).toBe('');
    expect(centsToDollarInput(undefined)).toBe('');
  });
});
