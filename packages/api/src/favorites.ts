import type { AppSupabaseClient } from './client';

/** Vehicle ids the user has saved, newest first (RLS: own rows only). */
export async function listFavoriteIds(
  client: AppSupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from('favorites')
    .select('vehicle_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((row) => row.vehicle_id);
}

export async function addFavorite(client: AppSupabaseClient, userId: string, vehicleId: string) {
  const { error } = await client
    .from('favorites')
    .upsert(
      { user_id: userId, vehicle_id: vehicleId },
      { onConflict: 'user_id,vehicle_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function removeFavorite(client: AppSupabaseClient, userId: string, vehicleId: string) {
  const { error } = await client
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('vehicle_id', vehicleId);
  if (error) throw error;
}

/** Merges favorites saved while signed out into the account after sign-in. */
export async function mergeFavorites(
  client: AppSupabaseClient,
  userId: string,
  vehicleIds: readonly string[],
) {
  if (vehicleIds.length === 0) return;
  const { error } = await client.from('favorites').upsert(
    vehicleIds.map((vehicle_id) => ({ user_id: userId, vehicle_id })),
    { onConflict: 'user_id,vehicle_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}
