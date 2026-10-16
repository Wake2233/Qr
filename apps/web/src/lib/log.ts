/**
 * Server logs: one readable line per event, in the terminal and in Vercel → Logs.
 *
 *   [auth.request-code] code sent · email=ja***@gmail.com · 412ms
 *   [inventory.save] refused: MISSING_FIELDS · fields=mileage,body_type
 *   [request] render failed · route=/inventory/[slug] · digest=2381…
 *
 * Search Vercel logs by the scope in brackets. Never log secrets, tokens, sign-in codes or
 * full emails/phone numbers (mask them with maskEmail).
 */
type Value = string | number | boolean | null | undefined | readonly string[];
export type LogFields = Record<string, Value>;

function format(value: Value): string {
  if (Array.isArray(value)) return value.join(',');
  return String(value);
}

export function formatLine(scope: string, message: string, fields: LogFields = {}): string {
  const parts = Object.entries(fields)
    .filter(
      ([, value]) =>
        value !== undefined && value !== '' && !(Array.isArray(value) && !value.length),
    )
    .map(([key, value]) => (key === 'ms' ? `${format(value)}ms` : `${key}=${format(value)}`));
  return [`[${scope}] ${message}`, ...parts].join(' · ');
}

/** Name, message and Supabase/Postgres details of anything thrown (for the log line). */
export function describeError(error: unknown): LogFields {
  if (!error || typeof error !== 'object') return { error: String(error) };
  const e = error as Record<string, unknown>;
  const pick = (key: string) =>
    typeof e[key] === 'string' || typeof e[key] === 'number'
      ? (e[key] as string | number)
      : undefined;
  const message = pick('message');
  const details = pick('details');
  return {
    error: pick('name'),
    message,
    code: pick('code'),
    status: pick('status'),
    // supabase-js repeats the message as `details` for network errors.
    details: details === message ? undefined : details,
    hint: pick('hint'),
  };
}

/** `jane.doe@gmail.com` → `ja***@gmail.com` (enough to tell people apart, not to contact them). */
export function maskEmail(email: string | null | undefined): string | undefined {
  if (!email) return undefined;
  const [user = '', domain = ''] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
}

export const log = {
  info(scope: string, message: string, fields?: LogFields) {
    console.info(formatLine(scope, message, fields));
  },
  warn(scope: string, message: string, fields?: LogFields) {
    console.warn(formatLine(scope, message, fields));
  },
  /** Unexpected failures. Pass the error to also print its stack. */
  error(scope: string, message: string, fields?: LogFields, error?: unknown) {
    console.error(
      formatLine(scope, message, { ...(error ? describeError(error) : {}), ...fields }),
      ...(error instanceof Error && error.stack ? [`\n${error.stack}`] : []),
    );
  },
};

/** Milliseconds since `started` (from Date.now()), for the `ms` field. */
export const since = (started: number) => Date.now() - started;
