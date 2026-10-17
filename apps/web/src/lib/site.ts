import 'server-only';

import { getFacets, getHouseDealer, getSiteSettings, type SiteSettings } from '@cp/api';
import { DEFAULT_WHATSAPP_TEMPLATE } from '@cp/core';
import { cacheLife, cacheTag } from 'next/cache';

import { cacheTags } from '@/lib/cache-tags';
import { describeError, log } from '@/lib/log';
import { createPublicClient } from '@/lib/supabase/public';

const FALLBACK: { settings: SiteSettings; house: null } = {
  settings: {
    brand_name: 'DG Auto',
    default_whatsapp_e164: null,
    default_phone_e164: null,
    whatsapp_template: DEFAULT_WHATSAPP_TEMPLATE,
    require_listing_review: false,
  },
  house: null,
};

/**
 * Brand, contact numbers and the house dealership's address for the header/footer.
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
    // Expected while Supabase is unreachable: one line, no stack (it repeats every few seconds).
    log.warn('site', 'settings unavailable, using built-in defaults for a minute', {
      ...describeError(error),
    });
    // 'minutes', not 'seconds': a shorter life makes every page's metadata dynamic, which
    // fails the build when it runs without a database (CI). It still refreshes within a minute.
    cacheLife('minutes');
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
  } catch (error) {
    log.warn('site', 'live listing count unavailable (hero shows the brand instead)', {
      error: error instanceof Error ? error.message : String(error),
    });
    cacheLife('minutes');
    return null;
  }
}
