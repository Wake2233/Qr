import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ColorScheme } from '@cp/design-tokens';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PreferencesState {
  /** Light by default, whatever the phone's setting; the Account tab switches it. */
  theme: ColorScheme;
  setTheme: (theme: ColorScheme) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'cp-preferences',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ theme }) => ({ theme }),
    },
  ),
);
