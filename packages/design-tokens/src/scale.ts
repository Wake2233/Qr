/** Corner radius scale (rem). `lg` is the base `--radius`. */
export const radius = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '0.875rem',
  xl: '1.25rem',
  '2xl': '1.75rem',
} as const;

/** Font families. Loaded per platform (next/font on web, expo-font on mobile). */
export const fontFamily = {
  display: 'Sora',
  sans: 'Inter',
  mono: 'JetBrains Mono',
} as const;

/** Layout constants shared by both apps. */
export const layout = {
  maxContentWidth: 1440,
  gutter: 16,
  minTouchTarget: 44,
} as const;
