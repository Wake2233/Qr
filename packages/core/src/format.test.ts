import { describe, expect, it } from 'vitest';

import { formatApr, formatMileage, formatPhone, formatPrice } from './format';

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
