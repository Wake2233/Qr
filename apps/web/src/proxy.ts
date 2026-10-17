import { NextResponse, type NextRequest } from 'next/server';

import { LOCALE_COOKIE } from '@/i18n/routing';
import { log } from '@/lib/log';
import { updateSession } from '@/lib/supabase/proxy';

/** `/ka/...` (Georgian) or `/en/...` (English, which canonically has no prefix). */
const LOCALE_PREFIX = /^\/(en|ka)(?=\/|$)/;
/** The console and sign-in are English-only. */
const ENGLISH_ONLY = /^\/(dashboard|login)(?=\/|$)/;
/** Route handlers and files that live outside the `[locale]` segment. */
const NOT_LOCALIZED = /^\/auth(\/|$)|\/[^/]+\.[a-z0-9]+$/i;

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

/**
 * Next 16 proxy (formerly middleware):
 * 1. Language: English pages are served from plain URLs (rewritten to `/en/...`), Georgian from
 *    `/ka/...`. A visitor who picked Georgian before is sent to the Georgian page.
 * 2. Refreshes the Supabase session and sends signed-out users away from /dashboard. Role checks
 *    happen in the dashboard layout; RLS is the real boundary.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const prefix = LOCALE_PREFIX.exec(pathname)?.[1];
  const path = prefix ? pathname.slice(prefix.length + 1) || '/' : pathname;

  if (prefix === 'en' || (prefix === 'ka' && ENGLISH_ONLY.test(path))) {
    return redirectTo(request, path);
  }
  const localized = !prefix && !NOT_LOCALIZED.test(pathname);
  if (
    localized &&
    request.method === 'GET' &&
    !ENGLISH_ONLY.test(pathname) &&
    request.cookies.get(LOCALE_COOKIE)?.value === 'ka'
  ) {
    return redirectTo(request, pathname === '/' ? '/ka' : `/ka${pathname}`);
  }

  const rewrite = localized ? new URL(`/en${pathname === '/' ? '' : pathname}`, request.url) : null;
  if (rewrite) rewrite.search = request.nextUrl.search;
  const { response, userId } = await updateSession(request, rewrite);

  if (!userId && path.startsWith('/dashboard')) {
    log.info('proxy', 'signed-out visit to the console → sign-in', { path });
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
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
