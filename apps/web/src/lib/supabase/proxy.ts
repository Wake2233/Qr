import type { Database } from '@cp/types';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/lib/env';

/**
 * Refreshes the Supabase session on every matched request and writes rotated tokens back to
 * both the forwarded request and the response. Returns the verified user id (or null).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Auth-cookie responses must never be cached by a CDN (prevents session leaks).
          for (const [key, value] of Object.entries(headers ?? {}))
            response.headers.set(key, value);
        },
      },
    },
  );

  // getClaims() verifies the JWT signature; never trust getSession() on the server.
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims.sub === 'string' ? data.claims.sub : null;

  return { response, userId };
}
