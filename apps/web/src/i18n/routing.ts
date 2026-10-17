import { DEFAULT_LOCALE, LOCALES } from '@cp/core';
import { defineRouting } from 'next-intl/routing';

/**
 * English lives at the plain URLs (`/inventory`), Georgian under `/ka` (`/ka/inventory`).
 * `src/proxy.ts` does the rewriting; the visitor's choice is kept in `LOCALE_COOKIE`.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  localeDetection: false,
  localeCookie: false,
});

/** Remembers the language a visitor picked (set by the language switch). */
export const LOCALE_COOKIE = 'NEXT_LOCALE';
