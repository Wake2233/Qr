import { priceDropCents, vehicleTitle, type InventoryFilters, type InventorySort } from '@cp/core';
import type { Enums, Tables } from '@cp/types';

import type { AppSupabaseClient } from './client';
import { vehicleImageUrl } from './storage';

/** Statuses shown in the storefront grid (sold cars appear in "recently sold" rails only). */
export const STOREFRONT_STATUSES = [
  'active',
  'reserved',
] as const satisfies Enums<'listing_status'>[];
export const DEFAULT_PAGE_SIZE = 24;

const CARD_COLUMNS =
  'id, slug, dealer_id, status, is_featured, condition, year, make_id, make_name, make_slug, model_id, model_name, model_slug, trim, body_type, fuel_type, drivetrain, transmission, mileage, price_cents, msrp_cents, exterior_color, seats, mpg_city, mpg_highway, ev_range_mi, stock_number, published_at, sold_at, created_at, dealer_name, dealer_slug, dealer_status, dealer_is_house, cover_path, cover_blurhash, cover_alt, cover_width, cover_height, image_count, feature_slugs, previous_price_cents, price_dropped_at' as const;

export type CardRow = Omit<Tables<'vehicle_cards'>, 'search_vector' | 'vin' | 'updated_at'>;

/** A `vehicle_cards` row with the always-present columns narrowed, plus display fields. */
export type VehicleCard = Omit<
  CardRow,
  'id' | 'slug' | 'year' | 'make_name' | 'model_name' | 'status'
> & {
  id: string;
  slug: string;
  year: number;
  make_name: string;
  model_name: string;
  status: Enums<'listing_status'>;
  title: string;
  cover_url: string | null;
};

export function toCard(client: AppSupabaseClient, row: CardRow): VehicleCard | null {
  const { id, slug, year, make_name, model_name, status } = row;
  if (!id || !slug || year === null || !make_name || !model_name || !status) return null;
  return {
    ...row,
    id,
    slug,
    year,
    make_name,
    model_name,
    status,
    title: vehicleTitle({ year, make: make_name, model: model_name, trim: row.trim }),
    cover_url: row.cover_path ? vehicleImageUrl(client, row.cover_path) : null,
  };
}

const SORTS: Record<InventorySort, { column: keyof CardRow; ascending: boolean }> = {
  newest: { column: 'published_at', ascending: false },
  price_asc: { column: 'price_cents', ascending: true },
  price_desc: { column: 'price_cents', ascending: false },
  mileage_asc: { column: 'mileage', ascending: true },
  year_desc: { column: 'year', ascending: false },
};

export interface VehiclePage {
  items: VehicleCard[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

/** Storefront grid: live listings of approved dealers, filtered, sorted and paginated. */
export async function listVehicles(
  client: AppSupabaseClient,
  filters: InventoryFilters = {},
  { pageSize = DEFAULT_PAGE_SIZE }: { pageSize?: number } = {},
): Promise<VehiclePage> {
  const page = filters.page ?? 1;
  const from = (page - 1) * pageSize;
  const sort = SORTS[filters.sort ?? 'newest'];

  let query = client
    .from('vehicle_cards')
    .select(CARD_COLUMNS, { count: 'exact' })
    .in('status', STOREFRONT_STATUSES)
    .eq('dealer_status', 'approved');

  if (filters.q)
    query = query.textSearch('search_vector', filters.q, { type: 'websearch', config: 'simple' });
  if (filters.make?.length) query = query.in('make_slug', filters.make);
  if (filters.model?.length) query = query.in('model_slug', filters.model);
  if (filters.body?.length) query = query.in('body_type', filters.body);
  if (filters.fuel?.length) query = query.in('fuel_type', filters.fuel);
  if (filters.drivetrain?.length) query = query.in('drivetrain', filters.drivetrain);
  if (filters.transmission?.length) query = query.in('transmission', filters.transmission);
  if (filters.condition?.length) query = query.in('condition', filters.condition);
  if (filters.color?.length) query = query.in('exterior_color', filters.color);
  if (filters.feature?.length) query = query.contains('feature_slugs', filters.feature);
  if (filters.yearMin !== undefined) query = query.gte('year', filters.yearMin);
  if (filters.yearMax !== undefined) query = query.lte('year', filters.yearMax);
  if (filters.priceMinCents !== undefined) query = query.gte('price_cents', filters.priceMinCents);
  if (filters.priceMaxCents !== undefined) query = query.lte('price_cents', filters.priceMaxCents);
  if (filters.mileageMax !== undefined) query = query.lte('mileage', filters.mileageMax);
  if (filters.seatsMin !== undefined) query = query.gte('seats', filters.seatsMin);
  if (filters.dealer) query = query.eq('dealer_slug', filters.dealer);

  const { data, count, error } = await query
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .order('id')
    .range(from, from + pageSize - 1);
  if (error) throw error;

  const total = count ?? 0;
  return {
    items: data.flatMap((row) => toCard(client, row) ?? []),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

/** Cards for compare/favorites, in the order requested. RLS decides what's visible. */
export async function getVehiclesByIds(
  client: AppSupabaseClient,
  ids: readonly string[],
): Promise<VehicleCard[]> {
  if (ids.length === 0) return [];
  const { data, error } = await client
    .from('vehicle_cards')
    .select(CARD_COLUMNS)
    .in('id', [...ids]);
  if (error) throw error;
  const byId = new Map(data.flatMap((row) => toCard(client, row) ?? []).map((c) => [c.id, c]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

/** Featured / newest live listings for home rails. */
export async function listFeaturedVehicles(client: AppSupabaseClient, limit = 8) {
  const { data, error } = await client
    .from('vehicle_cards')
    .select(CARD_COLUMNS)
    .in('status', STOREFRONT_STATUSES)
    .eq('dealer_status', 'approved')
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data.flatMap((row) => toCard(client, row) ?? []);
}

const DETAIL_COLUMNS = `
  id, slug, dealer_id, status, is_featured, condition, year, trim, stock_number, vin,
  body_type, mileage, price_cents, msrp_cents, exterior_color, interior_color, fuel_type,
  drivetrain, transmission, engine, cylinders, displacement_l, horsepower, torque_lbft,
  mpg_city, mpg_highway, ev_range_mi, doors, seats, owners_count, accident_free, title_status,
  description, specs, published_at, sold_at, updated_at,
  make:makes(id, name, slug),
  model:models(id, name, slug),
  dealer:dealers(id, slug, display_name, is_house, status, phone_e164, whatsapp_e164, email,
    address_line1, city, state, postal_code, logo_path, business_hours),
  images:vehicle_images(id, storage_path, position, width, height, blurhash, alt),
  features:vehicle_features(feature:features(id, name, slug, category)),
  price_history:vehicle_price_history(old_price_cents, new_price_cents, changed_at)
` as const;

/** Full vehicle for the VDP, or null when it doesn't exist or isn't visible to the caller. */
export async function getVehicleBySlug(client: AppSupabaseClient, slug: string) {
  const { data, error } = await client
    .from('vehicles')
    .select(DETAIL_COLUMNS)
    .eq('slug', slug)
    .order('position', { referencedTable: 'images', ascending: true })
    .order('changed_at', { referencedTable: 'price_history', ascending: false })
    .limit(10, { referencedTable: 'price_history' })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { make, model, images, features, price_history, ...vehicle } = data;
  const title = vehicleTitle({
    year: vehicle.year,
    make: make.name,
    model: model.name,
    trim: vehicle.trim,
  });
  // Same rule as the vehicle_cards view: the last change was a reduction to today's price.
  const last = price_history[0];
  const dropped =
    last !== undefined &&
    last.new_price_cents === vehicle.price_cents &&
    priceDropCents(last.old_price_cents, last.new_price_cents) !== null;
  return {
    ...vehicle,
    title,
    make,
    model,
    images: images.map((image) => ({ ...image, url: vehicleImageUrl(client, image.storage_path) })),
    features: features.flatMap(({ feature }) => (feature ? [feature] : [])),
    price_history,
    previous_price_cents: dropped ? last.old_price_cents : null,
    price_dropped_at: dropped ? last.changed_at : null,
  };
}

export type VehicleDetail = NonNullable<Awaited<ReturnType<typeof getVehicleBySlug>>>;
