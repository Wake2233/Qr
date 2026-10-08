import { SORT_OPTIONS, type InventoryFilters } from '@cp/core';
import { Constants } from '@cp/types';
import { z } from 'zod';

import { slug } from './shared';

const E = Constants.public.Enums;
const list = <T extends z.ZodType>(item: T) => z.array(item).max(30).optional();
const positiveInt = z.number().int().positive().optional();

/**
 * Strict validation of inventory filters (saved searches, server inputs).
 * URL parsing is lenient and lives in `@cp/core` (`parseInventoryFilters`).
 */
export const inventoryFiltersSchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    make: list(slug),
    model: list(slug),
    body: list(z.enum(E.body_type)),
    fuel: list(z.enum(E.fuel_type)),
    drivetrain: list(z.enum(E.drivetrain)),
    transmission: list(z.enum(E.transmission)),
    condition: list(z.enum(E.vehicle_condition)),
    color: list(z.string().trim().min(1).max(40)),
    feature: list(slug),
    yearMin: positiveInt,
    yearMax: positiveInt,
    priceMinCents: positiveInt,
    priceMaxCents: positiveInt,
    mileageMax: positiveInt,
    seatsMin: positiveInt,
    dealer: slug.optional(),
    sort: z.enum(SORT_OPTIONS).optional(),
    page: positiveInt,
  })
  .strict()
  .refine((f) => f.yearMin === undefined || f.yearMax === undefined || f.yearMin <= f.yearMax, {
    path: ['yearMax'],
    message: 'Max year must be after min year',
  })
  .refine(
    (f) =>
      f.priceMinCents === undefined ||
      f.priceMaxCents === undefined ||
      f.priceMinCents <= f.priceMaxCents,
    { path: ['priceMaxCents'], message: 'Max price must be above min price' },
  ) satisfies z.ZodType<InventoryFilters>;
