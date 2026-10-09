/**
 * Management-console inventory: list/edit/publish listings and manage their photos.
 * Every call runs as the signed-in user, so RLS, column grants and the publish gate apply.
 */
import { vehicleImagePath, vehicleTitle } from '@cp/core';
import {
  Constants,
  type Enums,
  type Tables,
  type TablesInsert,
  type TablesUpdate,
} from '@cp/types';
import type { VehicleUpsert } from '@cp/validators';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';

import type { AppSupabaseClient } from './client';
import { VEHICLE_IMAGES_BUCKET, vehicleImageUrl } from './storage';
import { toCard, type VehicleCard, type VehiclePage } from './vehicles';

type ListingStatus = Enums<'listing_status'>;

export const CONSOLE_SORTS = ['updated_desc', 'created_desc', 'price_asc', 'price_desc'] as const;
export type ConsoleSort = (typeof CONSOLE_SORTS)[number];
export const CONSOLE_PAGE_SIZE = 25;

export interface ConsoleVehicleFilters {
  q?: string;
  status?: ListingStatus;
  dealerId?: string;
  sort?: ConsoleSort;
  page?: number;
}

/** Which dealers' inventory the console shows: an admin sees everything. */
export type InventoryScope = { kind: 'all' } | { kind: 'dealers'; dealerIds: readonly string[] };

export type ConsoleVehicle = VehicleCard & { vin: string | null; updated_at: string | null };

const CONSOLE_COLUMNS =
  'id, slug, dealer_id, status, is_featured, condition, year, make_id, make_name, make_slug, model_id, model_name, model_slug, trim, body_type, fuel_type, drivetrain, transmission, mileage, price_cents, msrp_cents, exterior_color, seats, mpg_city, mpg_highway, ev_range_mi, stock_number, published_at, sold_at, created_at, dealer_name, dealer_slug, dealer_status, dealer_is_house, cover_path, cover_blurhash, cover_alt, cover_width, cover_height, image_count, feature_slugs, previous_price_cents, price_dropped_at, vin, updated_at' as const;

const SORT_COLUMNS: Record<
  ConsoleSort,
  { column: keyof Tables<'vehicle_cards'>; ascending: boolean }
> = {
  updated_desc: { column: 'updated_at', ascending: false },
  created_desc: { column: 'created_at', ascending: false },
  price_asc: { column: 'price_cents', ascending: true },
  price_desc: { column: 'price_cents', ascending: false },
};

/** Characters PostgREST treats as syntax inside `or=(...)` filters. */
const sanitizeTerm = (term: string) => term.replace(/[^\p{L}\p{N}\s-]/gu, '').trim();

/** Console table: the caller's inventory (any status), searchable by title, VIN or stock #. */
export async function listConsoleVehicles(
  client: AppSupabaseClient,
  scope: InventoryScope,
  filters: ConsoleVehicleFilters = {},
  { pageSize = CONSOLE_PAGE_SIZE }: { pageSize?: number } = {},
): Promise<VehiclePage & { items: ConsoleVehicle[] }> {
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * pageSize;
  const sort = SORT_COLUMNS[filters.sort ?? 'updated_desc'];

  let query = client.from('vehicle_cards').select(CONSOLE_COLUMNS, { count: 'exact' });
  if (scope.kind === 'dealers') query = query.in('dealer_id', [...scope.dealerIds]);
  if (filters.dealerId) query = query.eq('dealer_id', filters.dealerId);
  if (filters.status) query = query.eq('status', filters.status);

  const term = sanitizeTerm(filters.q ?? '');
  if (term && !/\s/.test(term)) {
    const like = `*${term}*`;
    query = query.or(
      ['stock_number', 'vin', 'make_name', 'model_name', 'trim']
        .map((column) => `${column}.ilike.${like}`)
        .join(','),
    );
  } else if (term) {
    query = query.textSearch('search_vector', term, { type: 'websearch', config: 'simple' });
  }

  const { data, count, error } = await query
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .order('id')
    .range(from, from + pageSize - 1);
  if (error) throw error;

  const total = count ?? 0;
  return {
    items: data.flatMap((row) => {
      const card = toCard(client, row);
      return card ? [{ ...card, vin: row.vin, updated_at: row.updated_at }] : [];
    }),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

const EDITOR_COLUMNS = `
  id, slug, dealer_id, status, is_featured, condition, year, make_id, model_id, trim,
  stock_number, vin, body_type, mileage, price_cents, msrp_cents, exterior_color,
  interior_color, fuel_type, drivetrain, transmission, engine, cylinders, displacement_l,
  horsepower, torque_lbft, mpg_city, mpg_highway, ev_range_mi, doors, seats, owners_count,
  accident_free, title_status, description, specs, published_at, sold_at, created_at, updated_at,
  make:makes(id, name),
  model:models(id, name),
  dealer:dealers(id, display_name, slug, status, is_house),
  images:vehicle_images(id, storage_path, position, width, height, blurhash, alt),
  features:vehicle_features(feature_id)
` as const;

/** Everything the editor needs for one listing, or null if the caller can't see it. */
export async function getConsoleVehicle(client: AppSupabaseClient, id: string) {
  const { data, error } = await client
    .from('vehicles')
    .select(EDITOR_COLUMNS)
    .eq('id', id)
    .order('position', { referencedTable: 'images', ascending: true })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { images, features, ...vehicle } = data;
  return {
    ...vehicle,
    title: vehicleTitle({
      year: vehicle.year,
      make: vehicle.make.name,
      model: vehicle.model.name,
      trim: vehicle.trim,
    }),
    images: images.map((image) => ({ ...image, url: vehicleImageUrl(client, image.storage_path) })),
    feature_ids: features.map((f) => f.feature_id),
  };
}

export type ConsoleVehicleDetail = NonNullable<Awaited<ReturnType<typeof getConsoleVehicle>>>;
export type ConsoleVehicleImage = ConsoleVehicleDetail['images'][number];

function toRow({ feature_ids: _features, ...fields }: VehicleUpsert) {
  return fields;
}

/** Creates a draft listing (features included). Publishing is a separate status change. */
export async function createVehicle(
  client: AppSupabaseClient,
  input: VehicleUpsert,
  userId: string,
): Promise<{ id: string; slug: string | null }> {
  const row: TablesInsert<'vehicles'> = { ...toRow(input), created_by: userId, status: 'draft' };
  const { data, error } = await client.from('vehicles').insert(row).select('id, slug').single();
  if (error) throw error;
  await setVehicleFeatures(client, data.id, input.feature_ids);
  return data;
}

/** Saves editor changes. `is_featured` is only sent when present (admins only). */
export async function updateVehicle(
  client: AppSupabaseClient,
  id: string,
  input: VehicleUpsert,
): Promise<{ id: string; slug: string | null; status: ListingStatus }> {
  const row: TablesUpdate<'vehicles'> = toRow(input);
  if (input.is_featured === undefined) delete row.is_featured;
  const { data, error } = await client
    .from('vehicles')
    .update(row)
    .eq('id', id)
    .select('id, slug, status')
    .single();
  if (error) throw error;
  await setVehicleFeatures(client, id, input.feature_ids);
  return data;
}

export async function setVehicleFeatures(
  client: AppSupabaseClient,
  vehicleId: string,
  featureIds: readonly number[],
) {
  const { error } = await client.rpc('set_vehicle_features', {
    p_vehicle_id: vehicleId,
    p_feature_ids: [...featureIds],
  });
  if (error) throw error;
}

/** Runs the status change through the publish gate; returns the resulting status
 * (`pending_review` when listing review is on for the dealer). */
export async function setVehicleStatus(
  client: AppSupabaseClient,
  vehicleId: string,
  status: ListingStatus,
): Promise<ListingStatus> {
  const { data, error } = await client.rpc('set_vehicle_status', {
    p_vehicle_id: vehicleId,
    p_status: status,
  });
  if (error) throw error;
  return data;
}

/** Inline price edit (the price-history trigger records the change). */
export async function updateVehiclePrice(
  client: AppSupabaseClient,
  vehicleId: string,
  priceCents: number,
) {
  const { data, error } = await client
    .from('vehicles')
    .update({ price_cents: priceCents })
    .eq('id', vehicleId)
    .select('id');
  if (error) throw error;
  // RLS hides rows the caller can't edit, so "no rows" means not found / not allowed.
  if (data.length === 0) throw new Error(`NOT_FOUND: vehicle ${vehicleId}`);
}

export type BulkVehiclePatch = { status: 'archived' } | { is_featured: boolean };

/** Bulk archive / (un)feature. Returns how many rows the caller was allowed to change. */
export async function bulkUpdateVehicles(
  client: AppSupabaseClient,
  ids: readonly string[],
  patch: BulkVehiclePatch,
): Promise<number> {
  if (ids.length === 0) return 0;
  const { data, error } = await client
    .from('vehicles')
    .update(patch)
    .in('id', [...ids])
    .select('id');
  if (error) throw error;
  return data.length;
}

/** Hard delete (admins only; dealers archive instead). */
export async function deleteVehicle(client: AppSupabaseClient, vehicleId: string) {
  const { data: images } = await client
    .from('vehicle_images')
    .select('storage_path')
    .eq('vehicle_id', vehicleId);
  const { error } = await client.from('vehicles').delete().eq('id', vehicleId);
  if (error) throw error;
  if (images?.length) {
    await client.storage.from(VEHICLE_IMAGES_BUCKET).remove(images.map((i) => i.storage_path));
  }
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export interface PhotoUploadTarget {
  path: string;
  /** PUT the file body here (no auth header needed); supports progress via XHR on both apps. */
  signedUrl: string;
  token: string;
}

/**
 * Reserves a storage path for one photo and returns a signed upload URL. Storage RLS is checked
 * here, so a dealer can only get URLs for their own vehicles.
 */
export async function createPhotoUpload(
  client: AppSupabaseClient,
  {
    dealerId,
    vehicleId,
    fileId,
    extension = 'webp',
  }: { dealerId: string; vehicleId: string; fileId: string; extension?: 'webp' | 'jpg' },
): Promise<PhotoUploadTarget> {
  const path = vehicleImagePath(dealerId, vehicleId, fileId, extension);
  const { data, error } = await client.storage
    .from(VEHICLE_IMAGES_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw error;
  return { path: data.path, signedUrl: data.signedUrl, token: data.token };
}

/** Upload without progress reporting (tests, scripts, small files). */
export async function uploadPhoto(
  client: AppSupabaseClient,
  target: Pick<PhotoUploadTarget, 'path' | 'token'>,
  body: ArrayBuffer | Blob,
  contentType = 'image/webp',
) {
  const { error } = await client.storage
    .from(VEHICLE_IMAGES_BUCKET)
    .uploadToSignedUrl(target.path, target.token, body, { contentType });
  if (error) throw error;
}

export interface UploadedPhoto {
  storage_path: string;
  width?: number | null;
  height?: number | null;
  blurhash?: string | null;
  alt?: string | null;
}

/** Registers uploaded files as the listing's next photos (positions assigned by the DB). */
export async function addVehicleImages(
  client: AppSupabaseClient,
  vehicleId: string,
  photos: readonly UploadedPhoto[],
) {
  const { data, error } = await client.rpc('add_vehicle_images', {
    p_vehicle_id: vehicleId,
    p_images: photos.map((photo) => ({ ...photo })),
  });
  if (error) throw error;
  return data.map((image) => ({ ...image, url: vehicleImageUrl(client, image.storage_path) }));
}

export async function reorderVehicleImages(
  client: AppSupabaseClient,
  vehicleId: string,
  orderedIds: readonly string[],
) {
  const { error } = await client.rpc('reorder_vehicle_images', {
    p_vehicle_id: vehicleId,
    p_ordered_ids: [...orderedIds],
  });
  if (error) throw error;
}

/** Deletes the row first (the DB refuses to remove a live listing's last photo), then the file. */
export async function deleteVehicleImage(
  client: AppSupabaseClient,
  image: { id: string; storage_path: string },
) {
  const { error } = await client.from('vehicle_images').delete().eq('id', image.id);
  if (error) throw error;
  await client.storage.from(VEHICLE_IMAGES_BUCKET).remove([image.storage_path]);
}

// ---------------------------------------------------------------------------
// VIN decode (Edge Function `decode-vin`)
// ---------------------------------------------------------------------------

const nullable = <T extends z.ZodType>(schema: T) => schema.nullable().catch(null);

export const vinDecodeSchema = z.object({
  vin: z.string(),
  cached: z.boolean().catch(false),
  year: nullable(z.number().int()),
  make: nullable(z.string()),
  model: nullable(z.string()),
  make_id: nullable(z.number().int()),
  model_id: nullable(z.number().int()),
  trim: nullable(z.string()),
  body_type: nullable(z.enum(Constants.public.Enums.body_type)),
  fuel_type: nullable(z.enum(Constants.public.Enums.fuel_type)),
  drivetrain: nullable(z.enum(Constants.public.Enums.drivetrain)),
  transmission: nullable(z.enum(Constants.public.Enums.transmission)),
  engine: nullable(z.string()),
  cylinders: nullable(z.number().int()),
  displacement_l: nullable(z.number()),
  horsepower: nullable(z.number().int()),
  doors: nullable(z.number().int()),
  seats: nullable(z.number().int()),
  warnings: z.array(z.string()).catch([]),
});

export type VinDecodeResult = z.infer<typeof vinDecodeSchema>;

export async function decodeVin(client: AppSupabaseClient, vin: string): Promise<VinDecodeResult> {
  const { data, error } = await client.functions.invoke('decode-vin', { body: { vin } });
  if (error) {
    // FunctionsHttpError carries the JSON body ({ error: "CODE: message" }) in `context` (a Response).
    if (error instanceof FunctionsHttpError) {
      const response = error.context as { json(): Promise<unknown> };
      const body: unknown = await response.json().catch(() => null);
      const parsed = z.object({ error: z.string() }).safeParse(body);
      if (parsed.success) throw new Error(parsed.data.error);
    }
    throw error;
  }
  return vinDecodeSchema.parse(data);
}
