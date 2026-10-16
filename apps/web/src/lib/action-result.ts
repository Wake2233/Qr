import { parseDbError } from '@cp/core';
import type { ActionResult } from '@cp/types';
import type { z } from 'zod';

import { describeError, log, since, type LogFields } from '@/lib/log';

type Failure = Extract<ActionResult<never>, { ok: false }>;

/*
 * Every Server Action names itself (`inventory.save`, `dealer.team.add` …) so its log lines are
 * easy to find: "ok" with the duration, "rejected" for bad input, "refused" for a business rule
 * the database enforced, and "failed" (with the raw error) for anything unexpected.
 * The ActionResult the browser receives only ever carries the friendly message.
 */

/** Zod issues → `{ field: [messages] }` keyed by the top-level path segment. */
export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function invalidInput(
  action: string,
  error: z.ZodError,
  message = 'Check the highlighted fields',
): Failure {
  const fieldErrors = zodFieldErrors(error);
  log.warn(action, 'rejected: invalid input', { fields: Object.keys(fieldErrors) });
  return { ok: false, error: message, fieldErrors };
}

/** A refusal decided in the action itself (wrong role, malformed request). */
export function refuse(action: string, message: string, reason?: string): Failure {
  log.warn(action, `refused: ${reason ?? message}`);
  return { ok: false, error: message };
}

/**
 * Database/RPC errors → friendly ActionResult. MISSING_FIELDS and unique violations point at
 * the offending fields; MISSING_IMAGES points at the photos section.
 */
export function dbFailure(action: string, error: unknown, context: LogFields = {}): Failure {
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
  if (parsed.code === 'UNKNOWN') {
    log.error(action, 'failed: unexpected error', context, error);
  } else {
    log.warn(action, `refused: ${parsed.code}`, { ...context, fields, ...pickDb(error) });
  }
  return { ok: false, error: parsed.message, ...(fieldErrors ? { fieldErrors } : {}) };
}

/** Postgres code/details only (the message is already summarised by the refusal code). */
function pickDb(error: unknown) {
  const { code, details } = describeError(error);
  return { pg: code, details };
}

/**
 * Runs a mutation, logs the outcome and converts thrown database errors into an ActionResult.
 * `context` (ids, the new status …) is added to the log line either way.
 */
export async function attempt<T>(
  action: string,
  fn: () => Promise<T>,
  context: LogFields = {},
): Promise<ActionResult<T>> {
  const started = Date.now();
  try {
    const data = await fn();
    log.info(action, 'ok', { ...context, ms: since(started) });
    return { ok: true, data };
  } catch (error) {
    return dbFailure(action, error, { ...context, ms: since(started) });
  }
}
