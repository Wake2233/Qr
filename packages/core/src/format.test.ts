import { describe, expect, it } from 'vitest';

import { formatMileage, formatPrice } from './format';

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
});

describe('formatMileage', () => {
  it('adds thousands separators and unit', () => {
    expect(formatMileage(42_180)).toBe('42,180 mi');
  });
});
