import { z } from 'zod';

/** Optional free text: trims, and turns "" into null (so forms can clear a column). */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullish()
    .transform((value) => value ?? null);

export const requiredText = (min: number, max: number, message?: string) =>
  z.string().trim().min(min, message).max(max);

/** Whole cents. Forms convert dollars → cents before validating. */
export const cents = z.number().int('Must be whole cents').nonnegative();
export const positiveCents = cents.positive('Must be greater than zero');

export const uuid = z.uuid();

export const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes')
  .max(120);
