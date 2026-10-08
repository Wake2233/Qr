'use server';

import type { ActionResult } from '@cp/types';
import { safeRedirectSchema, signInRequestSchema, verifyCodeSchema } from '@cp/validators';

import { env } from '@/lib/env';
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
    return {
      ok: false,
      error: 'Check your email address',
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const redirectTo = new URL('/auth/callback', env.NEXT_PUBLIC_SITE_URL);
  redirectTo.searchParams.set('next', safeRedirectSchema.parse(next));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo.toString() },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { email: parsed.data.email } };
}

/** Step 2: verify the code; the session cookie is set on success. */
export async function verifySignInCode(
  input: unknown,
  next?: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = verifyCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Check the code', fieldErrors: fieldErrors(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: 'email',
  });
  if (error) return { ok: false, error: 'That code is invalid or expired. Request a new one.' };
  return { ok: true, data: { redirectTo: safeRedirectSchema.parse(next) } };
}
