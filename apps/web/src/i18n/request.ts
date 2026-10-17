import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { locale as rootLocale } from 'next/root-params';

import type en from '../../messages/en.json';
import { routing } from './routing';

/** Messages for the `[locale]` root segment (read from the URL, so pages stay static). */
export default getRequestConfig(async ({ locale: requested }) => {
  const param = requested ?? (await rootLocale());
  const locale = hasLocale(routing.locales, param) ? param : routing.defaultLocale;
  const messages = (await import(`../../messages/${locale}.json`)) as { default: typeof en };
  return { locale, messages: messages.default };
});
