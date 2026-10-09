/** Admin-only console data: catalog, site settings and the user directory. RLS enforces admin. */
import type { Enums } from '@cp/types';
import type { SiteSettingsInput, siteSettingsSchema } from '@cp/validators';
import type { z } from 'zod';

import type { AppSupabaseClient } from './client';

type CatalogTable = 'makes' | 'models' | 'features';

export async function listCatalog(client: AppSupabaseClient) {
  const [makes, models, features] = await Promise.all([
    client.from('makes').select('id, name, slug, vehicles(count)').order('name'),
    client
      .from('models')
      .select('id, make_id, name, slug, default_body_type, vehicles(count)')
      .order('name'),
    client
      .from('features')
      .select('id, name, slug, category, vehicle_features(count)')
      .order('name'),
  ]);
  if (makes.error) throw makes.error;
  if (models.error) throw models.error;
  if (features.error) throw features.error;
  return {
    makes: makes.data.map(({ vehicles, ...m }) => ({ ...m, usage: vehicles[0]?.count ?? 0 })),
    models: models.data.map(({ vehicles, ...m }) => ({ ...m, usage: vehicles[0]?.count ?? 0 })),
    features: features.data.map(({ vehicle_features, ...f }) => ({
      ...f,
      usage: vehicle_features[0]?.count ?? 0,
    })),
  };
}

export type CatalogData = Awaited<ReturnType<typeof listCatalog>>;

export async function createMake(client: AppSupabaseClient, make: { name: string; slug: string }) {
  const { error } = await client.from('makes').insert(make);
  if (error) throw error;
}

export async function createModel(
  client: AppSupabaseClient,
  model: {
    make_id: number;
    name: string;
    slug: string;
    default_body_type?: Enums<'body_type'> | null;
  },
) {
  const { error } = await client.from('models').insert(model);
  if (error) throw error;
}

export async function createFeature(
  client: AppSupabaseClient,
  feature: { name: string; slug: string; category: Enums<'feature_category'> },
) {
  const { error } = await client.from('features').insert(feature);
  if (error) throw error;
}

/** Deletes an unused catalog entry; entries used by listings fail with a foreign-key error. */
export async function deleteCatalogEntry(
  client: AppSupabaseClient,
  table: CatalogTable,
  id: number,
) {
  const { data, error } = await client.from(table).delete().eq('id', id).select('id');
  if (error) throw error;
  if (data.length === 0) throw new Error('NOT_FOUND: catalog entry');
}

export async function updateSiteSettings(
  client: AppSupabaseClient,
  settings: z.output<typeof siteSettingsSchema>,
) {
  const { business_hours, apr_by_tier, ...fields } = settings;
  const { error } = await client
    .from('site_settings')
    .update({ ...fields, business_hours, apr_by_tier })
    .eq('id', 1);
  if (error) throw error;
}

export type { SiteSettingsInput };

export interface UserListOptions {
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listUsers(
  client: AppSupabaseClient,
  { search, page = 1, pageSize = 50 }: UserListOptions = {},
) {
  const { data, error } = await client.rpc('admin_list_users', {
    p_search: search ?? undefined,
    p_limit: pageSize,
    p_offset: (Math.max(1, page) - 1) * pageSize,
  });
  if (error) throw error;
  const total = Number(data[0]?.total_count ?? 0);
  return {
    items: data.map(({ total_count: _total, ...user }) => user),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type AdminUser = Awaited<ReturnType<typeof listUsers>>['items'][number];

export async function setUserRole(
  client: AppSupabaseClient,
  userId: string,
  role: Enums<'app_role'>,
) {
  const { error } = await client.rpc('set_user_role', { p_user_id: userId, p_role: role });
  if (error) throw error;
}
