'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { useEffect, useState, type ReactNode } from 'react';

import { FavoritesSync } from '@/lib/favorites/favorites-sync';
import { useCompareStore } from '@/lib/stores/compare';
import { useLocalFavoritesStore } from '@/lib/stores/favorites';
import { useRecentlyViewedStore } from '@/lib/stores/recently-viewed';

import { AuthProvider } from './auth-provider';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // RSC already rendered fresh data; avoid an immediate client refetch on hydration.
      queries: { staleTime: 60_000, refetchOnWindowFocus: false },
    },
  });
}

/** Client-side providers: URL state, React Query, auth and persisted Zustand stores. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  useEffect(() => {
    // Stores skip hydration during SSR so server and first client render match.
    void useCompareStore.persist.rehydrate();
    void useRecentlyViewedStore.persist.rehydrate();
    void useLocalFavoritesStore.persist.rehydrate();
  }, []);

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FavoritesSync />
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
