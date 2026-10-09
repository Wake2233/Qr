import { getVehiclesByIds, mergeFavorites, queryKeys } from '@cp/api';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner-native';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { useLocalFavoritesStore } from '@/stores/favorites';

/** After sign-in, moves favorites saved on this device into the account. */
export function FavoritesSync() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    const pending = useLocalFavoritesStore.getState().ids;
    if (pending.length === 0) return;
    // Only vehicles that still exist (a deleted one would fail the insert on its FK).
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
        toast.success('Your saved vehicles are now in your account.');
      })
      .catch(() => undefined);
  }, [userId, queryClient]);

  return null;
}
