'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LocalFavoritesState {
  ids: string[];
  toggle: (id: string) => void;
  clear: () => void;
}

/**
 * Favorites saved while signed out (newest first), persisted in localStorage. On sign-in
 * <FavoritesSync /> merges them into the account and clears this store.
 */
export const useLocalFavoritesStore = create<LocalFavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const { ids } = get();
        set({ ids: ids.includes(id) ? ids.filter((v) => v !== id) : [id, ...ids] });
      },
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'cp-favorites',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ ids }) => ({ ids }),
      skipHydration: true,
    },
  ),
);
