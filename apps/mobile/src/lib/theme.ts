import { colors, cssVars, hex, type ColorScheme } from '@cp/design-tokens';
import { vars } from 'nativewind';

import { usePreferencesStore } from '@/stores/preferences';

const themeVars = {
  light: vars(cssVars('light')),
  dark: vars(cssVars('dark')),
} as const;

/**
 * The active scheme (the user's choice, light by default) plus the NativeWind CSS-variable
 * style for the root view.
 */
export function useAppTheme() {
  const scheme: ColorScheme = usePreferencesStore((s) => s.theme);
  const palette = colors[scheme];
  return {
    scheme,
    rootStyle: themeVars[scheme],
    /** Concrete hex colors for native APIs that can't read CSS variables (tab bars, status bar). */
    native: {
      background: hex(palette.background),
      foreground: hex(palette.foreground),
      primary: hex(palette.primary),
      muted: hex(palette['muted-foreground']),
      card: hex(palette.card),
      border: hex(palette.border),
      primaryForeground: hex(palette['primary-foreground']),
      whatsappForeground: hex(palette['whatsapp-foreground']),
    },
  };
}
