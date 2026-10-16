import 'server-only';

import {
  dealerLogoUrl,
  getCatalog,
  getDealerBySlug,
  getFacets,
  getVehicleBySlug,
  getVehicleDetailsByIds,
  listFeaturedVehicles,
  listPriceDrops,
  listRecentlySold,
  listSimilarVehicles,
  listVehicles,
  type SimilarTo,
} from '@cp/api';
import type { InventoryFilters } from '@cp/core';
import { cacheLife, cacheTag } from 'next/cache';

import { cacheTags } from '@/lib/cache-tags';
import { describeError, log } from '@/lib/log';
import { createPublicClient } from '@/lib/supabase/public';

/*
 * Public storefront reads. Every function runs with the cookie-less anon client inside
 * `'use cache'`, so results depend only on the arguments. Inventory writes expire the
 * `vehicles` tag (and `vehicle:<id>` for the VDP) through `revalidateInventory()`.
 */

export async function getInventoryPage(filters: InventoryFilters) {
  'use cache';
  cacheTag(cacheTags.vehicles);
  cacheLife('minutes');
  return listVehicles(createPublicClient(), filters);
}

export async function getInventoryFacets(filters: InventoryFilters) {
  'use cache';
  cacheTag(cacheTags.vehicles);
  cacheLife('minutes');
  const { page: _page, sort: _sort, ...countFilters } = filters;
  return getFacets(createPublicClient(), countFilters);
}

/** Home rails and facet counts, or null while Supabase is unreachable (the hero still renders). */
export async function getHomeData() {
  'use cache';
  cacheTag(cacheTags.vehicles);
  cacheLife('minutes');
  const client = createPublicClient();
  try {
    const [featured, priceDrops, recentlySold, facets] = await Promise.all([
      listFeaturedVehicles(client, 10),
      listPriceDrops(client, 10),
      listRecentlySold(client, 10),
      getFacets(client),
    ]);
    return { featured, priceDrops, recentlySold, facets };
  } catch (error) {
    // Caught here, not by the caller: errors thrown out of a cached function fail prerendering.
    log.warn('home', 'listings unavailable, showing the hero only', { ...describeError(error) });
    return null;
  }
}

/** Every make and model for search suggestions and the hero, or null while Supabase is down. */
export async function getStorefrontCatalog() {
  'use cache';
  cacheTag(cacheTags.catalog);
  try {
    const catalog = await getCatalog(createPublicClient());
    cacheLife('hours');
    return catalog;
  } catch (error) {
    // Retry soon: a failure must not switch suggestions off for hours.
    cacheLife('minutes');
    log.warn('catalog', 'catalog unavailable, search suggestions are off', {
      ...describeError(error),
    });
    return null;
  }
}

export async function getVehicle(slug: string) {
  'use cache';
  cacheTag(cacheTags.vehicles);
  cacheLife('minutes');
  const vehicle = await getVehicleBySlug(createPublicClient(), slug);
  if (vehicle) cacheTag(cacheTags.vehicle(vehicle.id));
  return vehicle;
}

export async function getSimilarVehicles(vehicle: SimilarTo) {
  'use cache';
  cacheTag(cacheTags.vehicles);
  cacheLife('minutes');
  return listSimilarVehicles(createPublicClient(), vehicle);
}

export async function getCompareVehicles(ids: string[]) {
  'use cache';
  cacheTag(cacheTags.vehicles);
  for (const id of ids) cacheTag(cacheTags.vehicle(id));
  cacheLife('minutes');
  return getVehicleDetailsByIds(createPublicClient(), ids);
}

export async function getDealerStorefront(slug: string) {
  'use cache';
  cacheTag(cacheTags.vehicles);
  cacheLife('minutes');
  const client = createPublicClient();
  const dealer = await getDealerBySlug(client, slug);
  if (!dealer || dealer.status !== 'approved') return null;
  const inventory = await listVehicles(client, { dealer: dealer.slug }, { pageSize: 48 });
  return { dealer: { ...dealer, logo_url: dealerLogoUrl(client, dealer.logo_path) }, inventory };
}

/** Display name for a dealer slug (inventory filter chip). */
export async function getDealerName(slug: string) {
  'use cache';
  cacheLife('hours');
  const dealer = await getDealerBySlug(createPublicClient(), slug);
  return dealer?.display_name ?? null;
}

export type DealerStorefront = NonNullable<Awaited<ReturnType<typeof getDealerStorefront>>>;
