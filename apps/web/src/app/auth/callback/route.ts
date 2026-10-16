import { parseAuthError } from '@cp/core';
import { safeRedirectSchema } from '@cp/validators';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import { log } from '@/lib/log';
import { createClient } from '@/lib/supabase/server';

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  'email',
  'magiclink',
  'signup',
  'recovery',
  'invite',
  'email_change',
]);

/** Handles one-click email links (token_hash) and OAuth/PKCE redirects (code). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeRedirectSchema.parse(searchParams.get('next') ?? undefined);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');

  const supabase = await createClient();
  let method: 'link' | 'code' | 'none' = 'none';
  let error: unknown = null;
  if (tokenHash && type && EMAIL_OTP_TYPES.has(type)) {
    method = 'link';
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else if (code) {
    method = 'code';
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  }
  const ok = method !== 'none' && !error;

  if (ok) {
    log.info('auth.callback', 'signed in from email link', { method, next });
  } else if (method === 'none') {
    log.warn('auth.callback', 'sign-in link was missing its token', { type: type ?? undefined });
  } else {
    const failure = parseAuthError(error);
    log.warn('auth.callback', 'sign-in link rejected', {
      method,
      reason: failure.reason,
      supabase: failure.code,
      status: failure.status,
      fix:
        method === 'code'
          ? 'PKCE links only work in the browser that requested them; use the 6-digit code instead'
          : failure.hint,
    });
  }

  const response = NextResponse.redirect(new URL(ok ? next : '/login?error=link', origin));
  // This response carries auth cookies: never let a CDN/proxy cache it.
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
  return response;
}
