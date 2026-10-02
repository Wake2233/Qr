import { describe, expect, it } from 'vitest';

import { colorTokenNames, colors, cssVars, hex, rgb, type ColorScheme } from './colors';

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (rgbStr: string) => {
  const [r = 0, g = 0, b = 0] = rgbStr.split(' ').map(Number);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const schemes: ColorScheme[] = ['light', 'dark'];

describe('color tokens', () => {
  it.each(schemes)('%s palette defines every token as "r g b"', (scheme) => {
    for (const name of colorTokenNames) {
      expect(colors[scheme][name]).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
    }
  });

  it.each(schemes)('%s foreground pairs meet WCAG AA (4.5:1)', (scheme) => {
    const p = colors[scheme];
    const pairs = [
      ['foreground', 'background'],
      ['card-foreground', 'card'],
      ['muted-foreground', 'background'],
      ['primary-foreground', 'primary'],
      ['whatsapp-foreground', 'whatsapp'],
      ['success-foreground', 'success'],
    ] as const;
    for (const [fg, bg] of pairs) {
      expect(contrast(p[fg], p[bg]), `${scheme}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('cssVars prefixes token names', () => {
    expect(cssVars('dark')['--primary']).toBe(colors.dark.primary);
  });

  it('hex() converts channels', () => {
    expect(hex('9 9 11')).toBe('#09090b');
    expect(hex('251 113 60')).toBe('#fb713c');
  });

  it('rgb() formats channels with optional alpha', () => {
    expect(rgb('1 2 3')).toBe('rgb(1 2 3)');
    expect(rgb('1 2 3', 0.5)).toBe('rgb(1 2 3 / 0.5)');
  });
});
