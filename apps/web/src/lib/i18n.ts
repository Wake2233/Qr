import { LOCALES, type Locale } from '@cp/core';
import type { Metadata } from 'next';

/** `/inventory` → `/ka/inventory` (English keeps the plain path). */
export function localizedPath(locale: Locale, path: string) {
  if (locale === 'en') return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/** Canonical URL for this language plus `hreflang` links to every language version. */
export function localizedAlternates(locale: Locale, path: string): Metadata['alternates'] {
  return {
    canonical: localizedPath(locale, path),
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l, localizedPath(l, path)])),
      'x-default': path,
    },
  };
}
