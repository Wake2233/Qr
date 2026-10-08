import AsyncStorage from '@react-native-async-storage/async-storage';
import { addToCompare, MAX_COMPARE, removeFromCompare, type CompareAddResult } from '@cp/core';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface CompareState {
  ids: string[];
  add: (id: string) => CompareAddResult;
  remove: (id: string) => void;
  clear: () => void;
}

/** Compare tray (≤4 vehicles), persisted in AsyncStorage. Same rules as web via @cp/core. */
export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      add: (id) => {
        const { ids, result } = addToCompare(get().ids, id, MAX_COMPARE);
        set({ ids });
        return result;
      },
      remove: (id) => set({ ids: removeFromCompare(get().ids, id) }),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'cp-compare',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ ids }) => ({ ids }),
    },
  ),
);
