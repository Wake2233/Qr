import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LocalFavoritesState {
  ids: string[];
  toggle: (id: string) => void;
  clear: () => void;
}

/** Favorites saved while signed out (newest first). <FavoritesSync /> merges them on sign-in. */
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
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ ids }) => ({ ids }),
    },
  ),
);
