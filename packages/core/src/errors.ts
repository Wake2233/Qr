/**
 * Database business-rule errors are raised as `CODE: message` (SQLSTATE P0001) by triggers
 * and RPCs. This turns them into stable codes plus friendly copy for both apps.
 */
export const DB_ERROR_MESSAGES = {
  INVALID_MODEL: 'Pick a model that belongs to the selected make.',
  DEALER_NOT_APPROVED: 'Your dealership must be approved before listings can go live.',
  MISSING_FIELDS: 'Fill in the required fields before publishing.',
  INVALID_YEAR: 'The year cannot be later than next model year.',
  MISSING_IMAGES: 'Add at least one photo before publishing.',
  NOT_AUTHENTICATED: 'Please sign in to continue.',
  APPLICATION_PENDING: 'You already have a dealer application awaiting review.',
  FORBIDDEN: 'You do not have permission to do that.',
  LAST_ADMIN: 'At least one admin must remain.',
  LAST_OWNER: 'A dealership must keep at least one owner.',
  INVALID_ORDER: 'The photo order is out of date. Refresh and try again.',
  NOT_FOUND: 'That item no longer exists.',
} as const;

export type DbErrorCode = keyof typeof DB_ERROR_MESSAGES;

export interface ParsedDbError {
  code: DbErrorCode | 'UNKNOWN';
  message: string;
  /** Column names listed by MISSING_FIELDS, e.g. ["price_cents", "mileage"]. */
  fields: string[];
}

const PREFIXED = /^([A-Z][A-Z_]+):\s*(.*)$/s;

/** Accepts a PostgrestError / Error / string and extracts the business-rule code. */
export function parseDbError(error: unknown): ParsedDbError {
  const raw =
    typeof error === 'string'
      ? error
      : error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof error.message === 'string'
        ? error.message
        : '';
  const match = PREFIXED.exec(raw.trim());
  const code = match?.[1];
  if (code && code in DB_ERROR_MESSAGES) {
    const known = code as DbErrorCode;
    const fields =
      known === 'MISSING_FIELDS'
        ? (match[2] ?? '')
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean)
        : [];
    return { code: known, message: DB_ERROR_MESSAGES[known], fields };
  }
  return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.', fields: [] };
}
