import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LOCALE, type Locale } from '@cp/core';
import type { ColorScheme } from '@cp/design-tokens';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PreferencesState {
  /** Light by default, whatever the phone's setting; the Account tab switches it. */
  theme: ColorScheme;
  setTheme: (theme: ColorScheme) => void;
  /** English by default; the Account tab switches it. The console stays English. */
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'cp-preferences',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ theme, locale }) => ({ theme, locale }),
    },
  ),
);
