import { listSitemapDealers, listSitemapVehicles } from '@cp/api';
import type { MetadataRoute } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import { cacheTags } from '@/lib/cache-tags';
import { env } from '@/lib/env';
import { createPublicClient } from '@/lib/supabase/public';

const STATIC_PATHS = ['/', '/inventory', '/financing', '/sell-with-us', '/contact'] as const;

/** Storefront pages, every live listing and every approved dealer. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  'use cache';
  cacheTag(cacheTags.vehicles);
  const url = (path: string) => new URL(path, env.NEXT_PUBLIC_SITE_URL).href;
  const pages: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: url(path),
    changeFrequency: path === '/inventory' || path === '/' ? 'daily' : 'monthly',
    priority: path === '/' ? 1 : path === '/inventory' ? 0.9 : 0.5,
  }));

  try {
    const client = createPublicClient();
    const [vehicles, dealers] = await Promise.all([
      listSitemapVehicles(client),
      listSitemapDealers(client),
    ]);
    cacheLife('hours');
    return [
      ...pages,
      ...vehicles.map((v) => ({
        url: url(`/inventory/${v.slug}`),
        lastModified: v.updated_at ?? undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...dealers.map((d) => ({
        url: url(`/dealers/${d.slug}`),
        lastModified: d.updated_at,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ];
  } catch (error) {
    // A build without a database still gets a valid sitemap of the static pages.
    console.error('[sitemap] listing data unavailable:', error);
    cacheLife('minutes');
    return pages;
  }
}
