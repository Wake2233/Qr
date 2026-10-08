import { Constants } from '@cp/types';
import { z } from 'zod';

import { optionalText, positiveCents, uuid } from './shared';
import { vinSchema } from './vin';

const E = Constants.public.Enums;

/** Latest model year a listing may carry (mirrors the INVALID_YEAR publish check). */
export const maxModelYear = (now = new Date()) => now.getFullYear() + 1;

const smallInt = (min: number, max: number) => z.number().int().min(min).max(max).nullish();

/**
 * Create/update shape for a vehicle listing. Mirrors the `vehicles` columns and checks;
 * status changes go through `set_vehicle_status`, never through this schema.
 */
export const vehicleUpsertSchema = z.object({
  dealer_id: uuid,
  make_id: z.number().int().positive('Select a make'),
  model_id: z.number().int().positive('Select a model'),
  year: z.number().int().min(1950).max(2100),
  trim: optionalText(80),
  condition: z.enum(E.vehicle_condition).default('used'),
  vin: z
    .union([vinSchema, z.literal('')])
    .nullish()
    .transform((value) => value || null),
  stock_number: optionalText(40),
  body_type: z.enum(E.body_type).nullish(),
  mileage: z.number().int().min(0).max(2_000_000).nullish(),
  price_cents: positiveCents.nullish(),
  msrp_cents: positiveCents.nullish(),
  exterior_color: optionalText(40),
  interior_color: optionalText(40),
  fuel_type: z.enum(E.fuel_type).nullish(),
  drivetrain: z.enum(E.drivetrain).nullish(),
  transmission: z.enum(E.transmission).nullish(),
  engine: optionalText(80),
  cylinders: smallInt(0, 16),
  displacement_l: z
    .number()
    .positive()
    .max(99.9)
    .multipleOf(0.1, 'Use one decimal place')
    .nullish(),
  horsepower: smallInt(1, 5000),
  torque_lbft: smallInt(1, 5000),
  mpg_city: smallInt(1, 500),
  mpg_highway: smallInt(1, 500),
  ev_range_mi: smallInt(1, 2000),
  doors: smallInt(1, 6),
  seats: smallInt(1, 15),
  owners_count: smallInt(0, 50),
  accident_free: z.boolean().nullish(),
  title_status: z.enum(E.title_status).default('clean'),
  description: optionalText(10_000),
  is_featured: z.boolean().optional(),
  feature_ids: z.array(z.number().int().positive()).max(200).default([]),
});

export type VehicleUpsertInput = z.input<typeof vehicleUpsertSchema>;
export type VehicleUpsert = z.output<typeof vehicleUpsertSchema>;

/** Fields the publish gate requires (keep in sync with `vehicles_before_write`). */
export const PUBLISH_REQUIRED_FIELDS = [
  'price_cents',
  'mileage',
  'body_type',
  'fuel_type',
  'drivetrain',
  'transmission',
  'exterior_color',
] as const;

const requiredMessages: Record<(typeof PUBLISH_REQUIRED_FIELDS)[number], string> = {
  price_cents: 'Add a price',
  mileage: 'Add the mileage',
  body_type: 'Select a body style',
  fuel_type: 'Select a fuel type',
  drivetrain: 'Select a drivetrain',
  transmission: 'Select a transmission',
  exterior_color: 'Add the exterior color',
};

/**
 * Client-side mirror of the publish gate, so forms can flag missing fields before the
 * database rejects the status change. The database remains authoritative.
 */
export const vehiclePublishableSchema = vehicleUpsertSchema
  .extend({ image_count: z.number().int().min(0) })
  .superRefine((vehicle, ctx) => {
    for (const field of PUBLISH_REQUIRED_FIELDS) {
      if (vehicle[field] == null) {
        ctx.addIssue({ code: 'custom', path: [field], message: requiredMessages[field] });
      }
    }
    if (vehicle.year > maxModelYear()) {
      ctx.addIssue({
        code: 'custom',
        path: ['year'],
        message: 'Year cannot be later than next model year',
      });
    }
    if (vehicle.image_count < 1) {
      ctx.addIssue({ code: 'custom', path: ['image_count'], message: 'Add at least one photo' });
    }
  });
