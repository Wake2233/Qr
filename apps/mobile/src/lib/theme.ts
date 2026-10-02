import { colors, cssVars, hex, type ColorScheme } from '@cp/design-tokens';
import { vars } from 'nativewind';
import { useColorScheme } from 'react-native';

const themeVars = {
  light: vars(cssVars('light')),
  dark: vars(cssVars('dark')),
} as const;

/** Resolves the active scheme plus the NativeWind CSS-variable style for the root view. */
export function useAppTheme() {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
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
    },
  };
}
