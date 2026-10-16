import { describe, expect, it } from 'vitest';

import { parseAuthError } from './auth-errors';

const apiError = (code: string | undefined, status: number, message = '') => ({
  name: 'AuthApiError',
  code,
  status,
  message,
});

describe('parseAuthError', () => {
  it('turns the per-address cooldown into a countdown', () => {
    const parsed = parseAuthError(
      apiError(
        'over_email_send_rate_limit',
        429,
        'For security purposes, you can only request this after 47 seconds.',
      ),
    );
    expect(parsed).toMatchObject({ reason: 'email_cooldown', code: 'over_email_send_rate_limit' });
    expect(parsed.message).toBe('Please wait 47 seconds before asking for another code.');
    expect(parsed.hint).toMatch(/minimum interval/);
  });

  it('separates the project-wide email limit from the cooldown', () => {
    const parsed = parseAuthError(
      apiError('over_email_send_rate_limit', 429, 'email rate limit exceeded'),
    );
    expect(parsed.reason).toBe('email_limit');
    expect(parsed.message).not.toMatch(/rate limit/);
    expect(parsed.hint).toMatch(/Rate Limits/);
  });

  it.each([
    [apiError('over_request_rate_limit', 429), 'too_many_attempts'],
    [apiError(undefined, 429), 'too_many_attempts'],
    [apiError('otp_expired', 403, 'Token has expired or is invalid'), 'code_invalid'],
    [apiError('email_address_invalid', 400), 'email_invalid'],
    [apiError('email_address_not_authorized', 400), 'email_not_allowed'],
    [apiError('signup_disabled', 422), 'sign_in_disabled'],
    [apiError('user_banned', 403), 'account_blocked'],
    [apiError('unexpected_failure', 500, 'Error sending magic link email'), 'email_send_failed'],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'fetch failed' }, 'network'],
    [new Error('boom'), 'unknown'],
    ['nope', 'unknown'],
    [null, 'unknown'],
  ])('%o → %s', (error, reason) => {
    expect(parseAuthError(error).reason).toBe(reason);
  });

  it('keeps Supabase details for logs but never shows them on screen', () => {
    const parsed = parseAuthError(apiError('email_address_not_authorized', 400, 'raw text'));
    expect(parsed).toMatchObject({ code: 'email_address_not_authorized', status: 400 });
    expect(parsed.message).not.toContain('raw text');
    expect(parsed.message).not.toContain('SMTP');
  });
});
