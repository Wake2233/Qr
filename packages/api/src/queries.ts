/**
 * React Query options + hooks shared by web and mobile. Options factories let RSC prefetch
 * (`queryClient.prefetchQuery(vehicleQueries.detail(client, slug))`) with the same keys the
 * client hooks use.
 */
import type { InventoryFilters } from '@cp/core';
import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { listFeatures, listMakes, listModels } from './catalog';
import type { AppSupabaseClient } from './client';
import { getDealerBySlug } from './dealers';
import { getFacets } from './facets';
import { addFavorite, listFavoriteIds, removeFavorite } from './favorites';
import { queryKeys } from './query-keys';
import { getSiteSettings } from './settings';
import { getVehicleBySlug, getVehiclesByIds, listVehicles } from './vehicles';

const MINUTE = 60_000;

export const vehicleQueries = {
  list: (client: AppSupabaseClient, filters: InventoryFilters) =>
    queryOptions({
      queryKey: queryKeys.vehicles.list(filters),
      queryFn: () => listVehicles(client, filters),
      placeholderData: keepPreviousData,
    }),
  infinite: (client: AppSupabaseClient, filters: Omit<InventoryFilters, 'page'>) =>
    infiniteQueryOptions({
      queryKey: queryKeys.vehicles.infinite(filters),
      queryFn: ({ pageParam }) => listVehicles(client, { ...filters, page: pageParam }),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.page < last.pageCount ? last.page + 1 : undefined),
    }),
  detail: (client: AppSupabaseClient, slug: string) =>
    queryOptions({
      queryKey: queryKeys.vehicles.detail(slug),
      queryFn: () => getVehicleBySlug(client, slug),
    }),
  byIds: (client: AppSupabaseClient, ids: readonly string[]) =>
    queryOptions({
      queryKey: queryKeys.vehicles.byIds(ids),
      queryFn: () => getVehiclesByIds(client, ids),
      enabled: ids.length > 0,
    }),
  facets: (client: AppSupabaseClient, filters: InventoryFilters) =>
    queryOptions({
      queryKey: queryKeys.vehicles.facets(filters),
      queryFn: () => getFacets(client, filters),
      placeholderData: keepPreviousData,
    }),
};

export const catalogQueries = {
  makes: (client: AppSupabaseClient) =>
    queryOptions({
      queryKey: queryKeys.catalog.makes(),
      queryFn: () => listMakes(client),
      staleTime: 60 * MINUTE,
    }),
  models: (client: AppSupabaseClient, makeId?: number) =>
    queryOptions({
      queryKey: queryKeys.catalog.models(makeId),
      queryFn: () => listModels(client, makeId),
      staleTime: 60 * MINUTE,
    }),
  features: (client: AppSupabaseClient) =>
    queryOptions({
      queryKey: queryKeys.catalog.features(),
      queryFn: () => listFeatures(client),
      staleTime: 60 * MINUTE,
    }),
};

export const dealerQueries = {
  detail: (client: AppSupabaseClient, slug: string) =>
    queryOptions({
      queryKey: queryKeys.dealers.detail(slug),
      queryFn: () => getDealerBySlug(client, slug),
    }),
};

export const settingsQueries = {
  site: (client: AppSupabaseClient) =>
    queryOptions({
      queryKey: queryKeys.settings.site(),
      queryFn: () => getSiteSettings(client),
      staleTime: 10 * MINUTE,
    }),
};

export const favoriteQueries = {
  ids: (client: AppSupabaseClient, userId: string | null) =>
    queryOptions({
      queryKey: queryKeys.favorites.ids(userId ?? 'anonymous'),
      queryFn: () => (userId ? listFavoriteIds(client, userId) : Promise.resolve([])),
      enabled: userId !== null,
    }),
};

export const useVehicles = (client: AppSupabaseClient, filters: InventoryFilters) =>
  useQuery(vehicleQueries.list(client, filters));
export const useInfiniteVehicles = (
  client: AppSupabaseClient,
  filters: Omit<InventoryFilters, 'page'>,
) => useInfiniteQuery(vehicleQueries.infinite(client, filters));
export const useVehicle = (client: AppSupabaseClient, slug: string) =>
  useQuery(vehicleQueries.detail(client, slug));
export const useVehiclesByIds = (client: AppSupabaseClient, ids: readonly string[]) =>
  useQuery(vehicleQueries.byIds(client, ids));
export const useFacets = (client: AppSupabaseClient, filters: InventoryFilters) =>
  useQuery(vehicleQueries.facets(client, filters));
export const useMakes = (client: AppSupabaseClient) => useQuery(catalogQueries.makes(client));
export const useSiteSettings = (client: AppSupabaseClient) =>
  useQuery(settingsQueries.site(client));
export const useFavoriteIds = (client: AppSupabaseClient, userId: string | null) =>
  useQuery(favoriteQueries.ids(client, userId));

/** Saves/unsaves a vehicle with an optimistic update; rolls back if the write fails. */
export function useToggleFavorite(client: AppSupabaseClient, userId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.favorites.ids(userId);
  return useMutation({
    mutationFn: ({ vehicleId, saved }: { vehicleId: string; saved: boolean }) =>
      saved ? removeFavorite(client, userId, vehicleId) : addFavorite(client, userId, vehicleId),
    onMutate: async ({ vehicleId, saved }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<string[]>(queryKey);
      queryClient.setQueryData<string[]>(queryKey, (ids = []) =>
        saved ? ids.filter((id) => id !== vehicleId) : [vehicleId, ...ids],
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
