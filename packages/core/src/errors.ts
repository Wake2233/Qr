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
  TOO_MANY_IMAGES: 'A listing can have at most 40 photos.',
  INVALID_PATH: 'That photo was uploaded to the wrong place. Try uploading it again.',
  USER_NOT_FOUND: 'No account uses that email yet. Ask them to sign up first, then add them.',
  ALREADY_MEMBER: 'That person is already on your team.',
  DUPLICATE: 'That value is already in use.',
  IN_USE: 'This item is still used elsewhere, so it cannot be removed.',
} as const;

export type DbErrorCode = keyof typeof DB_ERROR_MESSAGES;

export interface ParsedDbError {
  code: DbErrorCode | 'UNKNOWN';
  message: string;
  /** Columns the error points at: MISSING_FIELDS lists, or the field of a unique violation. */
  fields: string[];
}

const PREFIXED = /^([A-Z][A-Z_]+):\s*(.*)$/s;

/** Unique indexes whose violations map to a specific form field and message. */
const UNIQUE_FIELDS: { match: RegExp; field: string; message: string }[] = [
  { match: /vin/, field: 'vin', message: 'Another live listing already uses this VIN.' },
  {
    match: /stock_number/,
    field: 'stock_number',
    message: 'This stock number is already used by another listing.',
  },
  { match: /slug/, field: 'slug', message: 'That slug is already taken.' },
];

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
  const sqlState =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : null;
  if (sqlState === '23505') {
    const known = UNIQUE_FIELDS.find((u) => u.match.test(raw));
    return {
      code: 'DUPLICATE',
      message: known?.message ?? DB_ERROR_MESSAGES.DUPLICATE,
      fields: known ? [known.field] : [],
    };
  }
  if (sqlState === '23503') {
    return { code: 'IN_USE', message: DB_ERROR_MESSAGES.IN_USE, fields: [] };
  }

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
