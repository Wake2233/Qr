import { colorTokenNames, type ColorTokenName } from './colors';
import { radius } from './scale';

/**
 * Tailwind v3 preset for NativeWind. Colors resolve to CSS variables that the mobile
 * root layout sets with NativeWind's `vars(cssVars(scheme))`.
 */
const themeColors = Object.fromEntries(
  colorTokenNames.map((name) => [name, `rgb(var(--${name}) / <alpha-value>)`]),
) as Record<ColorTokenName, string>;

const nativewindPreset = {
  theme: {
    extend: {
      colors: themeColors,
      borderRadius: radius,
    },
  },
};

export default nativewindPreset;
