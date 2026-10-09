'use client';

import { getVehiclesByIds, mergeFavorites, queryKeys } from '@cp/api';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { useLocalFavoritesStore } from '@/lib/stores/favorites';

/** After sign-in, moves favorites saved while signed out into the account. */
export function FavoritesSync() {
  const { user, supabase } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const pending = useLocalFavoritesStore.getState().ids;
    if (pending.length === 0) return;
    // Only vehicles that still exist (a deleted one would fail the whole insert on its FK).
    void getVehiclesByIds(supabase, pending)
      .then((cards) =>
        mergeFavorites(
          supabase,
          userId,
          cards.map((card) => card.id),
        ),
      )
      .then(() => {
        useLocalFavoritesStore.getState().clear();
        void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.ids(userId) });
        toast.success(
          pending.length === 1
            ? 'Your saved vehicle is now in your account.'
            : `Your ${pending.length} saved vehicles are now in your account.`,
        );
      })
      // Keep the local list; the next sign-in retries.
      .catch(() => undefined);
  }, [userId, supabase, queryClient]);

  return null;
}
