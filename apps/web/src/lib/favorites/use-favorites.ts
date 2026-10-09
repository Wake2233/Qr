'use client';

import { useFavoriteIds, useToggleFavorite } from '@cp/api';
import { useCallback, useMemo } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { useLocalFavoritesStore } from '@/lib/stores/favorites';

/**
 * One favorites API for the storefront: the account's saved list when signed in
 * (optimistic, synced across devices), otherwise this browser's local list.
 */
export function useFavorites() {
  const { user, supabase } = useAuth();
  const userId = user?.id ?? null;
  const localIds = useLocalFavoritesStore((s) => s.ids);
  const toggleLocal = useLocalFavoritesStore((s) => s.toggle);
  const server = useFavoriteIds(supabase, userId);
  const toggleServer = useToggleFavorite(supabase, userId ?? '');

  const serverIds = server.data;
  const ids = useMemo(() => (userId ? (serverIds ?? []) : localIds), [userId, serverIds, localIds]);
  const ready = user !== undefined && (!userId || !server.isPending);

  const toggle = useCallback(
    (vehicleId: string) => {
      if (userId) toggleServer.mutate({ vehicleId, saved: ids.includes(vehicleId) });
      else toggleLocal(vehicleId);
    },
    [userId, ids, toggleServer, toggleLocal],
  );

  return {
    ids,
    ready,
    signedIn: Boolean(userId),
    toggle,
    isSaved: (id: string) => ids.includes(id),
  };
}
