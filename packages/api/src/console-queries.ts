/**
 * React Query options + hooks for the management console (used by mobile /manage; web reads
 * in RSC and mutates through Server Actions). Every inventory mutation invalidates both the
 * console caches and the storefront `vehicles` caches so buyers see changes immediately.
 */
import type { Enums } from '@cp/types';
import type { VehicleUpsert } from '@cp/validators';
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import type { AppSupabaseClient } from './client';
import { listCatalog, listUsers } from './console-admin';
import {
  getConsoleDealer,
  listDealersForAdmin,
  moderateDealer,
  type DealerListFilters,
} from './console-dealers';
import {
  addVehicleImages,
  createVehicle,
  deleteVehicleImage,
  getConsoleVehicle,
  listConsoleVehicles,
  reorderVehicleImages,
  setVehicleStatus,
  updateVehicle,
  updateVehiclePrice,
  type ConsoleVehicleFilters,
  type InventoryScope,
  type UploadedPhoto,
} from './console-vehicles';
import { queryKeys } from './query-keys';

export const consoleQueries = {
  vehicles: (client: AppSupabaseClient, scope: InventoryScope, filters: ConsoleVehicleFilters) =>
    queryOptions({
      queryKey: queryKeys.console.vehicles(scope, filters),
      queryFn: () => listConsoleVehicles(client, scope, filters),
      placeholderData: keepPreviousData,
    }),
  vehicle: (client: AppSupabaseClient, id: string) =>
    queryOptions({
      queryKey: queryKeys.console.vehicle(id),
      queryFn: () => getConsoleVehicle(client, id),
    }),
  dealers: (client: AppSupabaseClient, filters: DealerListFilters) =>
    queryOptions({
      queryKey: queryKeys.console.dealers(filters),
      queryFn: () => listDealersForAdmin(client, filters),
    }),
  dealer: (client: AppSupabaseClient, id: string) =>
    queryOptions({
      queryKey: queryKeys.console.dealer(id),
      queryFn: () => getConsoleDealer(client, id),
    }),
  catalog: (client: AppSupabaseClient) =>
    queryOptions({ queryKey: queryKeys.console.catalog(), queryFn: () => listCatalog(client) }),
  users: (client: AppSupabaseClient, search: string, page: number) =>
    queryOptions({
      queryKey: queryKeys.console.users(search, page),
      queryFn: () => listUsers(client, { search, page }),
      placeholderData: keepPreviousData,
    }),
};

/** Refresh everything that shows inventory (console tables, editor, storefront grids). */
export function invalidateInventory(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.console.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
  ]);
}

export const useConsoleVehicles = (
  client: AppSupabaseClient,
  scope: InventoryScope,
  filters: ConsoleVehicleFilters,
) => useQuery(consoleQueries.vehicles(client, scope, filters));

export const useConsoleVehicle = (client: AppSupabaseClient, id: string | null) =>
  useQuery({ ...consoleQueries.vehicle(client, id ?? ''), enabled: Boolean(id) });

export const useAdminDealers = (client: AppSupabaseClient, filters: DealerListFilters) =>
  useQuery(consoleQueries.dealers(client, filters));

export const useConsoleDealer = (client: AppSupabaseClient, id: string) =>
  useQuery(consoleQueries.dealer(client, id));

export function useSaveVehicle(client: AppSupabaseClient, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: VehicleUpsert }) =>
      id ? updateVehicle(client, id, input) : createVehicle(client, input, userId),
    onSuccess: () => invalidateInventory(queryClient),
  });
}

export function useSetVehicleStatus(client: AppSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Enums<'listing_status'> }) =>
      setVehicleStatus(client, id, status),
    onSettled: () => invalidateInventory(queryClient),
  });
}

export function useUpdateVehiclePrice(client: AppSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priceCents }: { id: string; priceCents: number }) =>
      updateVehiclePrice(client, id, priceCents),
    onSettled: () => invalidateInventory(queryClient),
  });
}

export function useVehiclePhotos(client: AppSupabaseClient, vehicleId: string) {
  const queryClient = useQueryClient();
  const onSettled = () => invalidateInventory(queryClient);
  return {
    add: useMutation({
      mutationFn: (photos: UploadedPhoto[]) => addVehicleImages(client, vehicleId, photos),
      onSettled,
    }),
    reorder: useMutation({
      mutationFn: (orderedIds: string[]) => reorderVehicleImages(client, vehicleId, orderedIds),
      onSettled,
    }),
    remove: useMutation({
      mutationFn: (image: { id: string; storage_path: string }) =>
        deleteVehicleImage(client, image),
      onSettled,
    }),
  };
}

export function useModerateDealer(client: AppSupabaseClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof moderateDealer>[1]) => moderateDealer(client, input),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.console.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dealers.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
      ]),
  });
}
