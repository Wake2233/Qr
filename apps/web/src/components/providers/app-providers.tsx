'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { useCompareStore } from '@/lib/stores/compare';
import { useRecentlyViewedStore } from '@/lib/stores/recently-viewed';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // RSC already rendered fresh data; avoid an immediate client refetch on hydration.
      queries: { staleTime: 60_000, refetchOnWindowFocus: false },
    },
  });
}

/** Client-side providers: React Query and persisted Zustand stores. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  useEffect(() => {
    // Stores skip hydration during SSR so server and first client render match.
    void useCompareStore.persist.rehydrate();
    void useRecentlyViewedStore.persist.rehydrate();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
