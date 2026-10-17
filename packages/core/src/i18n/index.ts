import { en, type CoreDictionary } from './en';
import { featureNamesKa } from './features-ka';
import { ka } from './ka';

/** Languages of the buyer-facing apps. The consoles stay English. */
export const LOCALES = ['en', 'ka'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const localeNames: Record<Locale, string> = { en: 'English', ka: 'ქართული' };

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

const dictionaries: Record<Locale, CoreDictionary> = { en, ka };

/** Car vocabulary (enum labels, spec rows, chips) in one language. */
export function coreDictionary(locale: Locale = DEFAULT_LOCALE): CoreDictionary {
  return dictionaries[locale];
}

/** A catalog feature's name in the given language (English when there is no translation). */
export function featureName(feature: { slug: string; name: string }, locale?: Locale): string {
  return (locale === 'ka' ? featureNamesKa[feature.slug] : undefined) ?? feature.name;
}

export type { CoreDictionary };
