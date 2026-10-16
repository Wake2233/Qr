/**
 * Supabase Auth errors → one short sentence for the person signing in, plus an operator hint
 * for the server logs (what to check in the Supabase dashboard). Duck-typed, so it works with
 * AuthApiError / AuthRetryableFetchError from supabase-js without depending on it.
 * Codes: https://supabase.com/docs/guides/auth/debugging/error-codes
 */
export type AuthErrorReason =
  | 'email_cooldown'
  | 'email_limit'
  | 'too_many_attempts'
  | 'code_invalid'
  | 'email_invalid'
  | 'email_not_allowed'
  | 'sign_in_disabled'
  | 'account_blocked'
  | 'email_send_failed'
  | 'network'
  | 'unknown';

export interface ParsedAuthError {
  reason: AuthErrorReason;
  /** Safe to show on screen. */
  message: string;
  /** Logs only: where an operator should look. */
  hint: string | null;
  /** Supabase's error code and HTTP status, for logs. */
  code: string | null;
  status: number | null;
}

const HINTS = {
  email_cooldown: 'Per-address cooldown: Authentication → Providers → Email → minimum interval',
  email_limit:
    'Project email limit reached: Authentication → Rate Limits → "Rate limit for sending emails"',
  too_many_attempts:
    'Per-IP limit reached: Authentication → Rate Limits (sign-ins / token verifications)',
  email_not_allowed:
    'Built-in Supabase email only reaches team members: set up custom SMTP (Authentication → Emails → SMTP Settings)',
  sign_in_disabled: 'Email sign-in or sign-ups are off: Authentication → Providers → Email',
  email_send_failed:
    'SMTP delivery failed: check Authentication → Emails → SMTP Settings (host, port, user, app password)',
  network:
    'The server could not reach Supabase (check NEXT_PUBLIC_SUPABASE_URL and project status)',
} as const;

function field(error: unknown, key: string): unknown {
  return error && typeof error === 'object' && key in error
    ? (error as Record<string, unknown>)[key]
    : undefined;
}

/** Accepts an AuthError (or anything thrown) and returns friendly copy plus log details. */
export function parseAuthError(error: unknown): ParsedAuthError {
  const rawCode = field(error, 'code');
  const rawStatus = field(error, 'status');
  const rawMessage = field(error, 'message');
  const code = typeof rawCode === 'string' && rawCode ? rawCode : null;
  const status = typeof rawStatus === 'number' ? rawStatus : null;
  const message = typeof rawMessage === 'string' ? rawMessage : '';
  const name = field(error, 'name');

  const result = (
    reason: AuthErrorReason,
    copy: string,
    hint: string | null = null,
  ): ParsedAuthError => ({ reason, message: copy, hint, code, status });

  if (code === 'over_email_send_rate_limit') {
    const seconds = /after (\d+) seconds?/i.exec(message)?.[1];
    return seconds
      ? result(
          'email_cooldown',
          `Please wait ${seconds} seconds before asking for another code.`,
          HINTS.email_cooldown,
        )
      : result(
          'email_limit',
          'We’ve sent a lot of sign-in emails just now. Please try again in a few minutes.',
          HINTS.email_limit,
        );
  }
  if (code === 'over_request_rate_limit' || (status === 429 && !code)) {
    return result(
      'too_many_attempts',
      'Too many attempts. Please wait a minute and try again.',
      HINTS.too_many_attempts,
    );
  }
  if (code === 'otp_expired' || code === 'otp_invalid' || code === 'bad_code_verifier') {
    return result('code_invalid', 'That code is wrong or has expired. Check it or get a new one.');
  }
  if (code === 'email_address_invalid' || code === 'validation_failed') {
    return result('email_invalid', 'Enter a valid email address.');
  }
  if (code === 'email_address_not_authorized') {
    return result(
      'email_not_allowed',
      'We couldn’t send a code to this address right now. Please try again later.',
      HINTS.email_not_allowed,
    );
  }
  if (code === 'signup_disabled' || code === 'email_provider_disabled' || code === 'otp_disabled') {
    return result(
      'sign_in_disabled',
      'Sign-in is unavailable right now. Please try again later.',
      HINTS.sign_in_disabled,
    );
  }
  if (code === 'user_banned') {
    return result('account_blocked', 'This account can’t sign in. Please contact us.');
  }
  if (/error sending/i.test(message)) {
    return result(
      'email_send_failed',
      'We couldn’t send the email right now. Please try again in a few minutes.',
      HINTS.email_send_failed,
    );
  }
  if (name === 'AuthRetryableFetchError' || status === 0 || /fetch failed/i.test(message)) {
    return result(
      'network',
      'We can’t reach the server. Check your connection and try again.',
      HINTS.network,
    );
  }
  return result('unknown', 'Something went wrong. Please try again.');
}
