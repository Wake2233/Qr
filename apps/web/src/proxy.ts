import { NextResponse, type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';

/**
 * Next 16 proxy (formerly middleware): refreshes the session and sends signed-out users away
 * from /dashboard. Role checks happen in the dashboard layout; RLS is the real boundary.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);

  if (!userId && request.nextUrl.pathname.startsWith('/dashboard')) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimization.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
