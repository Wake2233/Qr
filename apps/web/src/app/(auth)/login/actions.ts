'use server';

import { parseAuthError } from '@cp/core';
import type { ActionResult } from '@cp/types';
import { safeRedirectSchema, signInRequestSchema, verifyCodeSchema } from '@cp/validators';

import { env } from '@/lib/env';
import { log, maskEmail, since } from '@/lib/log';
import { createClient } from '@/lib/supabase/server';

const fieldErrors = (issues: { path: PropertyKey[]; message: string }[]) =>
  Object.fromEntries(issues.map((i) => [String(i.path[0] ?? 'form'), [i.message]]));

/** Step 1: email a 6-digit code (plus a one-click link). Creates the account on first sign-in. */
export async function requestSignInCode(
  input: unknown,
  next?: string,
): Promise<ActionResult<{ email: string }>> {
  const parsed = signInRequestSchema.safeParse(input);
  if (!parsed.success) {
    log.warn('auth.request-code', 'rejected: invalid email');
    return {
      ok: false,
      error: 'Check your email address',
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }
  const email = maskEmail(parsed.data.email);

  const redirectTo = new URL('/auth/callback', env.NEXT_PUBLIC_SITE_URL);
  redirectTo.searchParams.set('next', safeRedirectSchema.parse(next));

  const started = Date.now();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo.toString() },
  });
  if (error) {
    const failure = parseAuthError(error);
    const fields = {
      email,
      reason: failure.reason,
      supabase: failure.code ?? error.message,
      status: failure.status,
      fix: failure.hint,
      ms: since(started),
    };
    if (failure.reason === 'unknown' || failure.reason === 'email_send_failed') {
      log.error('auth.request-code', 'code NOT sent', fields, error);
    } else {
      log.warn('auth.request-code', 'code NOT sent', fields);
    }
    return { ok: false, error: failure.message };
  }
  log.info('auth.request-code', 'code sent', { email, ms: since(started) });
  return { ok: true, data: { email: parsed.data.email } };
}

/** Step 2: verify the code; the session cookie is set on success. */
export async function verifySignInCode(
  input: unknown,
  next?: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = verifyCodeSchema.safeParse(input);
  if (!parsed.success) {
    log.warn('auth.verify-code', 'rejected: malformed code');
    return { ok: false, error: 'Check the code', fieldErrors: fieldErrors(parsed.error.issues) };
  }
  const email = maskEmail(parsed.data.email);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: 'email',
  });
  if (error) {
    const failure = parseAuthError(error);
    log.warn('auth.verify-code', 'sign-in failed', {
      email,
      reason: failure.reason,
      supabase: failure.code ?? error.message,
      status: failure.status,
      fix: failure.hint,
    });
    return { ok: false, error: failure.message };
  }
  const redirectTo = safeRedirectSchema.parse(next);
  log.info('auth.verify-code', 'signed in', { email, user: data.user?.id, next: redirectTo });
  return { ok: true, data: { redirectTo } };
}
