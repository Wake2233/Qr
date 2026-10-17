import type { Locale } from '@cp/core';
import { Share } from 'react-native';

import { env } from './env';

/** Public web URL of a listing in the app's language (`/ka/inventory/…` for Georgian). */
export const vehicleWebUrl = (slug: string, locale: Locale = 'en') =>
  new URL(`${locale === 'ka' ? '/ka' : ''}/inventory/${slug}`, env.EXPO_PUBLIC_SITE_URL).href;

/** Native share sheet with the listing title, price and link. */
export async function shareVehicle({
  title,
  price,
  slug,
  locale,
}: {
  title: string;
  price: string | null;
  slug: string;
  locale?: Locale;
}) {
  const url = vehicleWebUrl(slug, locale);
  await Share.share({ title, message: [title, price, url].filter(Boolean).join(' · '), url });
}
