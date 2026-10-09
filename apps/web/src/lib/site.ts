import 'server-only';

import { getFacets, getHouseDealer, getSiteSettings, type SiteSettings } from '@cp/api';
import { DEFAULT_WHATSAPP_TEMPLATE } from '@cp/core';
import { cacheLife, cacheTag } from 'next/cache';

import { cacheTags } from '@/lib/cache-tags';
import { createPublicClient } from '@/lib/supabase/public';

const FALLBACK: { settings: SiteSettings; house: null } = {
  settings: {
    brand_name: 'Car Platform',
    default_whatsapp_e164: null,
    default_phone_e164: null,
    whatsapp_template: DEFAULT_WHATSAPP_TEMPLATE,
    business_hours: {},
    apr_by_tier: {},
    lender_network_size: 0,
    require_listing_review: false,
  },
  house: null,
};

/**
 * Brand, contact numbers, hours and the house dealership's address for the header/footer.
 * Cached for hours; admins' settings edits revalidate the tag. If Supabase is unreachable
 * (e.g. a CI build without a database) it falls back briefly instead of failing the page.
 */
export async function getSiteInfo() {
  'use cache';
  cacheTag(cacheTags.siteSettings);
  try {
    const client = createPublicClient();
    const [settings, house] = await Promise.all([getSiteSettings(client), getHouseDealer(client)]);
    cacheLife('hours');
    return { settings, house };
  } catch (error) {
    console.error('[site] falling back to defaults:', error);
    cacheLife('seconds');
    return FALLBACK;
  }
}

export type SiteInfo = Awaited<ReturnType<typeof getSiteInfo>>;

/** Live listing count for the home hero. */
export async function getLiveInventoryCount(): Promise<number | null> {
  'use cache';
  cacheTag(cacheTags.vehicles);
  try {
    const { total } = await getFacets(createPublicClient());
    cacheLife('minutes');
    return total;
  } catch {
    cacheLife('seconds');
    return null;
  }
}
