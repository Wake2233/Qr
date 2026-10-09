import type { AppSupabaseClient } from './client';
import { STOREFRONT_STATUSES } from './vehicles';

const SITEMAP_LIMIT = 5000;

/** Live listings of approved dealers for sitemap.xml (slug + last change). */
export async function listSitemapVehicles(client: AppSupabaseClient) {
  const { data, error } = await client
    .from('vehicle_cards')
    .select('slug, updated_at')
    .in('status', STOREFRONT_STATUSES)
    .eq('dealer_status', 'approved')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(SITEMAP_LIMIT);
  if (error) throw error;
  return data.flatMap(({ slug, updated_at }) => (slug ? [{ slug, updated_at }] : []));
}

/** Approved dealers' storefront pages (RLS shows only approved dealers to anon). */
export async function listSitemapDealers(client: AppSupabaseClient) {
  const { data, error } = await client
    .from('dealers')
    .select('slug, updated_at')
    .eq('status', 'approved')
    .order('slug')
    .limit(SITEMAP_LIMIT);
  if (error) throw error;
  return data;
}
