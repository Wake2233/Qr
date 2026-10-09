import { useFavoriteIds, useToggleFavorite } from '@cp/api';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo } from 'react';

import { useSession } from '@/providers/session-provider';
import { useLocalFavoritesStore } from '@/stores/favorites';

import { supabase } from './supabase';

/** The account's favorites when signed in (synced); this device's list otherwise. */
export function useFavorites() {
  const { session, loading } = useSession();
  const userId = session?.user.id ?? null;
  const localIds = useLocalFavoritesStore((s) => s.ids);
  const toggleLocal = useLocalFavoritesStore((s) => s.toggle);
  const server = useFavoriteIds(supabase, userId);
  const toggleServer = useToggleFavorite(supabase, userId ?? '');

  const serverIds = server.data;
  const ids = useMemo(() => (userId ? (serverIds ?? []) : localIds), [userId, serverIds, localIds]);

  const toggle = useCallback(
    (vehicleId: string) => {
      void Haptics.selectionAsync();
      if (userId) toggleServer.mutate({ vehicleId, saved: ids.includes(vehicleId) });
      else toggleLocal(vehicleId);
    },
    [userId, ids, toggleServer, toggleLocal],
  );

  return {
    ids,
    ready: !loading && (!userId || !server.isPending),
    signedIn: Boolean(userId),
    toggle,
    isSaved: (id: string) => ids.includes(id),
  };
}
