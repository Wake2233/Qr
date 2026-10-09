'use client';

import {
  FILTER_PARAM_KEYS,
  parseInventoryFilters,
  serializeInventoryFilters,
  type InventoryFilters,
} from '@cp/core';
import { createParser, useQueryStates, type ParserBuilder } from 'nuqs';
import { useCallback, useMemo } from 'react';

type FilterKey = keyof InventoryFilters;
type Parsers = { [K in FilterKey]: ParserBuilder<NonNullable<InventoryFilters[K]>> };

/**
 * nuqs parsers generated from @cp/core so the URL format has one definition (shared with
 * the server page and mobile deep links): each parser runs the core parse/serialize on
 * its own param.
 */
function parserFor<K extends FilterKey>(key: K): Parsers[K] {
  const param = FILTER_PARAM_KEYS[key];
  return createParser<NonNullable<InventoryFilters[K]>>({
    parse: (value) =>
      (parseInventoryFilters({ [param]: value })[key] ?? null) as NonNullable<
        InventoryFilters[K]
      > | null,
    serialize: (value) =>
      serializeInventoryFilters({ [key]: value } as InventoryFilters)[param] ?? '',
    eq: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  }) as Parsers[K];
}

const parsers = Object.fromEntries(
  (Object.keys(FILTER_PARAM_KEYS) as FilterKey[]).map((key) => [key, parserFor(key)]),
) as Parsers;

const urlKeys = FILTER_PARAM_KEYS;

/** Inventory filters ⇄ URL. Updates are shallow (no server round trip) and pushed to history. */
export function useInventoryFilters() {
  const [state, setState] = useQueryStates(parsers, {
    urlKeys,
    history: 'push',
    shallow: true,
    scroll: false,
  });

  const filters = useMemo(() => {
    const next: InventoryFilters = {};
    for (const [key, value] of Object.entries(state)) {
      if (value !== null) (next as Record<string, unknown>)[key] = value;
    }
    // Normalize through core (sorted lists, defaults dropped) so query keys are canonical.
    return parseInventoryFilters(serializeInventoryFilters(next));
  }, [state]);

  const setFilters = useCallback(
    (next: InventoryFilters, { replace = false }: { replace?: boolean } = {}) => {
      const update = Object.fromEntries(
        (Object.keys(FILTER_PARAM_KEYS) as FilterKey[]).map((key) => [key, next[key] ?? null]),
      ) as { [K in FilterKey]: NonNullable<InventoryFilters[K]> | null };
      return setState(update, replace ? { history: 'replace' } : undefined);
    },
    [setState],
  );

  return { filters, setFilters };
}
