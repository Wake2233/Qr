import { listSitemapDealers, listSitemapVehicles } from '@cp/api';
import { LOCALES } from '@cp/core';
import type { MetadataRoute } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import { cacheTags } from '@/lib/cache-tags';
import { env } from '@/lib/env';
import { localizedPath } from '@/lib/i18n';
import { log } from '@/lib/log';
import { createPublicClient } from '@/lib/supabase/public';

const STATIC_PATHS = ['/', '/inventory', '/sell-with-us', '/contact'] as const;

type Entry = MetadataRoute.Sitemap[number];

/**
 * Storefront pages, every live listing and every approved dealer, in English and Georgian
 * (each entry links its other-language version).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  'use cache';
  cacheTag(cacheTags.vehicles);
  const url = (path: string) => new URL(path, env.NEXT_PUBLIC_SITE_URL).href;
  const inEveryLanguage = (entry: Omit<Entry, 'url'> & { path: string }): Entry[] => {
    const { path, ...rest } = entry;
    const languages = Object.fromEntries(LOCALES.map((l) => [l, url(localizedPath(l, path))]));
    return LOCALES.map((l) => ({
      ...rest,
      url: url(localizedPath(l, path)),
      alternates: { languages },
    }));
  };
  const pages: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((path) =>
    inEveryLanguage({
      path,
      changeFrequency: path === '/inventory' || path === '/' ? 'daily' : 'monthly',
      priority: path === '/' ? 1 : path === '/inventory' ? 0.9 : 0.5,
    }),
  );

  try {
    const client = createPublicClient();
    const [vehicles, dealers] = await Promise.all([
      listSitemapVehicles(client),
      listSitemapDealers(client),
    ]);
    cacheLife('hours');
    return [
      ...pages,
      ...vehicles.flatMap((v) =>
        inEveryLanguage({
          path: `/inventory/${v.slug}`,
          lastModified: v.updated_at ?? undefined,
          changeFrequency: 'weekly',
          priority: 0.8,
        }),
      ),
      ...dealers.flatMap((d) =>
        inEveryLanguage({
          path: `/dealers/${d.slug}`,
          lastModified: d.updated_at,
          changeFrequency: 'weekly',
          priority: 0.6,
        }),
      ),
    ];
  } catch (error) {
    // A build without a database still gets a valid sitemap of the static pages.
    log.error('sitemap', 'listing data unavailable: static pages only', {}, error);
    cacheLife('minutes');
    return pages;
  }
}
