import type { Catalog } from '@cp/core';

import type { AppSupabaseClient } from './client';

export async function listMakes(client: AppSupabaseClient) {
  const { data, error } = await client.from('makes').select('id, name, slug').order('name');
  if (error) throw error;
  return data;
}

export async function listModels(client: AppSupabaseClient, makeId?: number) {
  let query = client.from('models').select('id, make_id, name, slug, default_body_type');
  if (makeId !== undefined) query = query.eq('make_id', makeId);
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data;
}

export async function listFeatures(client: AppSupabaseClient) {
  const { data, error } = await client
    .from('features')
    .select('id, name, slug, category, icon')
    .order('category')
    .order('name');
  if (error) throw error;
  return data;
}

/**
 * Every make and model, compact, for the search suggestions and the hero search.
 * Two small queries; the storefront caches the result (tag `catalog`).
 */
export async function getCatalog(client: AppSupabaseClient): Promise<Catalog> {
  const [makes, models] = await Promise.all([
    client.from('makes').select('id, name, slug').order('name'),
    client.from('models').select('make_id, name, slug').order('name'),
  ]);
  if (makes.error) throw makes.error;
  if (models.error) throw models.error;
  const makeSlugs = new Map(makes.data.map((make) => [make.id, make.slug]));
  return {
    makes: makes.data.map(({ name, slug }) => ({ name, slug })),
    models: models.data.flatMap(({ make_id, name, slug }) => {
      const make = makeSlugs.get(make_id);
      return make ? [{ name, slug, make }] : [];
    }),
  };
}
