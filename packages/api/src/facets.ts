import type { InventoryFilters } from '@cp/core';
import type { Json } from '@cp/types';
import { z } from 'zod';

import type { AppSupabaseClient } from './client';

const bucket = z.object({ value: z.string(), count: z.number().int() });
const labeled = bucket.extend({ label: z.string() });
const range = z.object({ min: z.number().nullable(), max: z.number().nullable() });

/** Response of `get_inventory_facets`; parsed so both apps get typed facet counts. */
export const inventoryFacetsSchema = z.object({
  total: z.number().int(),
  make: z.array(labeled),
  model: z.array(labeled.extend({ make: z.string() })),
  body: z.array(bucket),
  fuel: z.array(bucket),
  drivetrain: z.array(bucket),
  transmission: z.array(bucket),
  condition: z.array(bucket),
  color: z.array(bucket),
  feature: z.array(labeled),
  price: range,
  year: range,
  mileage: range,
});

export type InventoryFacets = z.infer<typeof inventoryFacetsSchema>;

/** Filters → the snake_case jsonb the RPC expects (page and sort don't affect counts). */
export function toFacetPayload(filters: InventoryFilters): { [key: string]: Json } {
  const payload: Record<string, Json | undefined> = {
    q: filters.q,
    make: filters.make,
    model: filters.model,
    body: filters.body,
    fuel: filters.fuel,
    drivetrain: filters.drivetrain,
    transmission: filters.transmission,
    condition: filters.condition,
    color: filters.color,
    feature: filters.feature,
    year_min: filters.yearMin,
    year_max: filters.yearMax,
    price_min_cents: filters.priceMinCents,
    price_max_cents: filters.priceMaxCents,
    mileage_max: filters.mileageMax,
    seats_min: filters.seatsMin,
    dealer: filters.dealer,
  };
  const defined: { [key: string]: Json } = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) defined[key] = value;
  }
  return defined;
}

export async function getFacets(
  client: AppSupabaseClient,
  filters: InventoryFilters = {},
): Promise<InventoryFacets> {
  const { data, error } = await client.rpc('get_inventory_facets', {
    p_filters: toFacetPayload(filters),
  });
  if (error) throw error;
  return inventoryFacetsSchema.parse(data);
}
