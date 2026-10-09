import type { InventoryFilters } from '@cp/core';

/*
 * Query-key scopes shared by the server page (prefetch + hydrate) and the client browser,
 * so both write/read the same React Query cache entries.
 */

/** Facet counts ignore paging and sorting, so they share one cache entry per filter set. */
export function facetFiltersOf(filters: InventoryFilters): InventoryFilters {
  const { page: _page, sort: _sort, ...rest } = filters;
  return rest;
}

/** The infinite grid pages itself; its key is the filters without `page`. */
export function listFiltersOf(filters: InventoryFilters): InventoryFilters {
  const { page: _page, ...rest } = filters;
  return rest;
}
