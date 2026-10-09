import { vinSchema } from '@cp/validators';

/** Pulls a valid VIN out of a scanned payload (some labels prefix it with "I" or wrap it). */
export function extractVin(data: string): string | null {
  const cleaned = data.toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (const candidate of [cleaned, cleaned.slice(1), cleaned.slice(0, 17), cleaned.slice(1, 18)]) {
    if (vinSchema.safeParse(candidate).success) return candidate;
  }
  return null;
}
