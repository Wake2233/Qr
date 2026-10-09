import type { InventoryFilters } from '@cp/core';

import type { ConsoleVehicleFilters, InventoryScope } from './console-vehicles';
import type { DealerListFilters } from './console-dealers';

/**
 * Query-key factory shared by web and mobile so invalidations hit the same cache entries.
 * Every key nests under its domain root, so `invalidateQueries({ queryKey: queryKeys.vehicles.all })`
 * refreshes lists, details and facets after any inventory mutation.
 */
export const queryKeys = {
  vehicles: {
    all: ['vehicles'] as const,
    lists: () => [...queryKeys.vehicles.all, 'list'] as const,
    list: (filters: InventoryFilters) => [...queryKeys.vehicles.lists(), filters] as const,
    infinite: (filters: InventoryFilters) =>
      [...queryKeys.vehicles.all, 'infinite', filters] as const,
    detail: (slug: string) => [...queryKeys.vehicles.all, 'detail', slug] as const,
    byIds: (ids: readonly string[]) => [...queryKeys.vehicles.all, 'by-ids', [...ids]] as const,
    facets: (filters: InventoryFilters) => [...queryKeys.vehicles.all, 'facets', filters] as const,
    rail: (name: 'featured' | 'price-drops' | 'recently-sold') =>
      [...queryKeys.vehicles.all, 'rail', name] as const,
    similar: (id: string) => [...queryKeys.vehicles.all, 'similar', id] as const,
    compare: (ids: readonly string[]) => [...queryKeys.vehicles.all, 'compare', [...ids]] as const,
  },
  catalog: {
    all: ['catalog'] as const,
    makes: () => [...queryKeys.catalog.all, 'makes'] as const,
    models: (makeId?: number) => [...queryKeys.catalog.all, 'models', makeId ?? 'all'] as const,
    features: () => [...queryKeys.catalog.all, 'features'] as const,
  },
  dealers: {
    all: ['dealers'] as const,
    detail: (slug: string) => [...queryKeys.dealers.all, 'detail', slug] as const,
  },
  favorites: {
    all: ['favorites'] as const,
    ids: (userId: string) => [...queryKeys.favorites.all, userId] as const,
  },
  settings: {
    site: () => ['settings', 'site'] as const,
  },
  /** Management console. Inventory mutations invalidate `console.all` *and* `vehicles.all`. */
  console: {
    all: ['console'] as const,
    vehicles: (scope: InventoryScope, filters: ConsoleVehicleFilters) =>
      [...queryKeys.console.all, 'vehicles', scope, filters] as const,
    vehicle: (id: string) => [...queryKeys.console.all, 'vehicle', id] as const,
    dealers: (filters: DealerListFilters) =>
      [...queryKeys.console.all, 'dealers', filters] as const,
    dealer: (id: string) => [...queryKeys.console.all, 'dealer', id] as const,
    catalog: () => [...queryKeys.console.all, 'catalog'] as const,
    users: (search: string, page: number) =>
      [...queryKeys.console.all, 'users', search, page] as const,
  },
} as const;
