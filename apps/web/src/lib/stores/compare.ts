'use client';

import { addToCompare, MAX_COMPARE, removeFromCompare, type CompareAddResult } from '@cp/core';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface CompareState {
  ids: string[];
  add: (id: string) => CompareAddResult;
  remove: (id: string) => void;
  /** replaces the tray (opening a shared /compare link) */
  setIds: (ids: string[]) => void;
  clear: () => void;
}

/** Compare tray (≤4 vehicles), persisted in localStorage. Rehydrated by <StoreHydrator />. */
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
      setIds: (ids) => set({ ids: ids.slice(0, MAX_COMPARE) }),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'cp-compare',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ ids }) => ({ ids }),
      skipHydration: true,
    },
  ),
);
