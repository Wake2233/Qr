import {
  FILTER_PARAM_KEYS,
  parseInventoryFilters,
  serializeInventoryFilters,
  type InventoryFilters,
} from '@cp/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

const PARAMS = Object.values(FILTER_PARAM_KEYS);

/**
 * Search filters live in the route params (`/search?make=bmw&fuel=hybrid`), in the same
 * format as the web URL (via @cp/core), so deep links and home shortcuts just work.
 */
export function useInventoryFilters() {
  const params = useLocalSearchParams();
  const router = useRouter();
  // Canonical query string of the filter params (arrays join with commas, which core splits).
  const query = PARAMS.flatMap((p) => {
    const value = params[p];
    return value === undefined ? [] : [`${p}=${encodeURIComponent(String(value))}`];
  }).join('&');
  const filters = useMemo(() => parseInventoryFilters(query), [query]);

  const setFilters = useCallback(
    (next: InventoryFilters) => {
      const serialized = serializeInventoryFilters(next);
      // undefined removes a param that is no longer set.
      router.setParams(Object.fromEntries(PARAMS.map((p) => [p, serialized[p]])));
    },
    [router],
  );

  return { filters, setFilters };
}
