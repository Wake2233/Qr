import { Share } from 'react-native';

import { env } from './env';

/** Public web URL of a listing (shared links open the web VDP / universal link). */
export const vehicleWebUrl = (slug: string) =>
  new URL(`/inventory/${slug}`, env.EXPO_PUBLIC_SITE_URL).href;

/** Native share sheet with the listing title, price and link. */
export async function shareVehicle({ title, price, slug }: { title: string; price: string | null; slug: string }) {
  const url = vehicleWebUrl(slug);
  await Share.share({ title, message: [title, price, url].filter(Boolean).join(' · '), url });
}
