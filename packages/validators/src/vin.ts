import { z } from 'zod';

/** 17-character VIN; letters I, O and Q are never used. Normalized to uppercase. */
export const vinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'VIN must be 17 characters and cannot contain I, O or Q');

export type Vin = z.infer<typeof vinSchema>;
