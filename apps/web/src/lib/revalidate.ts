import 'server-only';

import { refresh, updateTag } from 'next/cache';

import { cacheTags } from '@/lib/cache-tags';

/**
 * After an inventory write: expire the public listing caches immediately (read-your-own-writes)
 * and refresh the console's dynamic data on the client.
 */
export function revalidateInventory(...vehicleIds: string[]) {
  updateTag(cacheTags.vehicles);
  for (const id of vehicleIds) updateTag(cacheTags.vehicle(id));
  refresh();
}

export function revalidateSiteSettings() {
  updateTag(cacheTags.siteSettings);
  refresh();
}
