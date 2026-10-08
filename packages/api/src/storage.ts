import type { AppSupabaseClient } from './client';

export const VEHICLE_IMAGES_BUCKET = 'vehicle-images';

/** Public URL for a `vehicle-images` object (the bucket is public-read). */
export function vehicleImageUrl(client: AppSupabaseClient, path: string): string {
  return client.storage.from(VEHICLE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}
