'use client';

import { localeNames, type Locale } from '@cp/core';
import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { LOCALE_COOKIE } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const SHORT: Record<Locale, string> = { en: 'EN', ka: 'ქა' };

/** The same page and filters in the other language; the choice is remembered for a year. */
export function switchLocale(target: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
  const { pathname, search, hash } = window.location;
  const path = pathname.replace(/^\/ka(?=\/|$)/, '') || '/';
  const next = target === 'ka' ? `/ka${path === '/' ? '' : path}` : path;
  // A full load on purpose: the root layout (html lang, fonts, messages) changes with the language.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${next}${search}${hash}`);
}

/** Header button: shows the language you can switch to. */
export function LanguageSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const target: Locale = locale === 'ka' ? 'en' : 'ka';
  return (
    <Button
      variant="ghost"
      size="sm"
      lang={target}
      aria-label={localeNames[target]}
      className={cn('gap-1.5 px-2.5', className)}
      onClick={() => switchLocale(target)}
    >
      <Languages aria-hidden />
      {SHORT[target]}
    </Button>
  );
}

/** Two-option switch for the mobile menu. */
export function LanguageOptions() {
  const locale = useLocale();
  const t = useTranslations('Header');
  return (
    <div role="radiogroup" aria-label={t('language')} className="flex gap-1">
      {(Object.keys(localeNames) as Locale[]).map((option) => (
        <Button
          key={option}
          role="radio"
          aria-checked={option === locale}
          lang={option}
          size="sm"
          variant={option === locale ? 'default' : 'outline'}
          onClick={() => option !== locale && switchLocale(option)}
        >
          {localeNames[option]}
        </Button>
      ))}
    </div>
  );
}
