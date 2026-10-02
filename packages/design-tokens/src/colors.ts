/**
 * Semantic color tokens, stored as space-separated RGB channels ("r g b") so both
 * Tailwind v4 (web) and NativeWind/Tailwind v3 (mobile) can apply opacity modifiers.
 *
 * Names follow shadcn/ui conventions so web primitives work unchanged.
 * Contrast pairs were checked against WCAG 2.2 AA (see colors.test.ts).
 */
export const colorTokenNames = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'whatsapp',
  'whatsapp-foreground',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
] as const;

export type ColorTokenName = (typeof colorTokenNames)[number];
export type ColorScheme = 'light' | 'dark';
export type ColorPalette = Record<ColorTokenName, string>;

const light: ColorPalette = {
  background: '250 250 249',
  foreground: '12 12 14',
  card: '255 255 255',
  'card-foreground': '12 12 14',
  popover: '255 255 255',
  'popover-foreground': '12 12 14',
  primary: '210 64 14', // ember
  'primary-foreground': '255 255 255',
  secondary: '244 244 245',
  'secondary-foreground': '24 24 27',
  muted: '244 244 245',
  'muted-foreground': '113 113 122',
  accent: '244 244 245',
  'accent-foreground': '24 24 27',
  destructive: '220 38 38',
  'destructive-foreground': '255 255 255',
  success: '21 128 61',
  'success-foreground': '255 255 255',
  warning: '180 83 9',
  'warning-foreground': '255 255 255',
  whatsapp: '21 128 61',
  'whatsapp-foreground': '255 255 255',
  border: '228 228 231',
  input: '228 228 231',
  ring: '210 64 14',
  'chart-1': '210 64 14',
  'chart-2': '13 148 136',
  'chart-3': '37 99 235',
  'chart-4': '202 138 4',
  'chart-5': '124 58 237',
  sidebar: '250 250 249',
  'sidebar-foreground': '12 12 14',
  'sidebar-primary': '210 64 14',
  'sidebar-primary-foreground': '255 255 255',
  'sidebar-accent': '244 244 245',
  'sidebar-accent-foreground': '24 24 27',
  'sidebar-border': '228 228 231',
  'sidebar-ring': '210 64 14',
};

const dark: ColorPalette = {
  background: '9 9 11', // showroom black
  foreground: '244 244 245',
  card: '17 17 20',
  'card-foreground': '244 244 245',
  popover: '17 17 20',
  'popover-foreground': '244 244 245',
  primary: '251 113 60', // ember, brightened for dark surfaces
  'primary-foreground': '9 9 11',
  secondary: '28 28 32',
  'secondary-foreground': '244 244 245',
  muted: '28 28 32',
  'muted-foreground': '161 161 170',
  accent: '28 28 32',
  'accent-foreground': '244 244 245',
  destructive: '239 68 68',
  'destructive-foreground': '9 9 11',
  success: '34 197 94',
  'success-foreground': '9 9 11',
  warning: '245 158 11',
  'warning-foreground': '9 9 11',
  whatsapp: '37 211 102',
  'whatsapp-foreground': '9 9 11',
  border: '39 39 42',
  input: '39 39 42',
  ring: '251 113 60',
  'chart-1': '251 113 60',
  'chart-2': '45 212 191',
  'chart-3': '96 165 250',
  'chart-4': '250 204 21',
  'chart-5': '167 139 250',
  sidebar: '12 12 14',
  'sidebar-foreground': '244 244 245',
  'sidebar-primary': '251 113 60',
  'sidebar-primary-foreground': '9 9 11',
  'sidebar-accent': '28 28 32',
  'sidebar-accent-foreground': '244 244 245',
  'sidebar-border': '39 39 42',
  'sidebar-ring': '251 113 60',
};

export const colors: Record<ColorScheme, ColorPalette> = { light, dark };

/** `"r g b"` → `"rgb(r g b)"`, for places that need a concrete color (e.g. native tab bars). */
export function rgb(channels: string, alpha?: number): string {
  return alpha === undefined ? `rgb(${channels})` : `rgb(${channels} / ${alpha})`;
}

/** `"r g b"` → `"#rrggbb"`, for native APIs that only accept hex/rgb() strings. */
export function hex(channels: string): string {
  return `#${channels
    .split(' ')
    .map((c) => Number(c).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** CSS custom properties for a scheme, e.g. `{ '--primary': '210 64 14' }`. */
export function cssVars(scheme: ColorScheme): Record<`--${ColorTokenName}`, string> {
  const palette = colors[scheme];
  return Object.fromEntries(colorTokenNames.map((name) => [`--${name}`, palette[name]])) as Record<
    `--${ColorTokenName}`,
    string
  >;
}
