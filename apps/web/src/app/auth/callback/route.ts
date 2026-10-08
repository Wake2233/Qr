import { safeRedirectSchema } from '@cp/validators';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

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
  let ok = false;
  if (tokenHash && type && EMAIL_OTP_TYPES.has(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  const response = NextResponse.redirect(new URL(ok ? next : '/login?error=link', origin));
  // This response carries auth cookies: never let a CDN/proxy cache it.
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
  return response;
}
