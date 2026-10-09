import { parseDbError } from '@cp/core';
import type { ActionResult } from '@cp/types';
import type { z } from 'zod';

type Failure = Extract<ActionResult<never>, { ok: false }>;

/** Zod issues → `{ field: [messages] }` keyed by the top-level path segment. */
export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function invalidInput(error: z.ZodError, message = 'Check the highlighted fields'): Failure {
  return { ok: false, error: message, fieldErrors: zodFieldErrors(error) };
}

/**
 * Database/RPC errors → friendly ActionResult. MISSING_FIELDS and unique violations point at
 * the offending fields; MISSING_IMAGES points at the photos section.
 */
export function dbFailure(error: unknown): Failure {
  const parsed = parseDbError(error);
  const fields =
    parsed.code === 'MISSING_IMAGES' || parsed.code === 'TOO_MANY_IMAGES'
      ? ['images']
      : parsed.fields;
  const fieldErrors = fields.length
    ? Object.fromEntries(
        fields.map((field) => [
          field,
          [parsed.code === 'MISSING_FIELDS' ? 'Required to publish' : parsed.message],
        ]),
      )
    : undefined;
  if (parsed.code === 'UNKNOWN') console.error('[console action]', error);
  return { ok: false, error: parsed.message, ...(fieldErrors ? { fieldErrors } : {}) };
}

/** Runs a mutation and converts thrown database errors into an ActionResult. */
export async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return dbFailure(error);
  }
}
