import { coreDictionary, type CoreDictionary, type Locale } from '@cp/core';

import { usePreferencesStore } from '@/stores/preferences';

import { en, type Messages } from './en';
import { ka } from './ka';

const messages: Record<Locale, Messages> = { en, ka };

/** The visitor's language (English by default; switched on the Account tab). */
export function useLocale(): Locale {
  return usePreferencesStore((s) => s.locale);
}

/** Buyer-screen text in the current language. */
export function useT(): Messages {
  return messages[useLocale()];
}

/** Shared car vocabulary (body styles, fuel, specs…) in the current language. */
export function useCoreT(): CoreDictionary {
  return coreDictionary(useLocale());
}

export type { Messages };
