import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushRecentlyViewed } from '@cp/core';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface RecentlyViewedState {
  ids: string[];
  push: (id: string) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      ids: [],
      push: (id) => set({ ids: pushRecentlyViewed(get().ids, id) }),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'cp-recently-viewed',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ ids }) => ({ ids }),
    },
  ),
);
