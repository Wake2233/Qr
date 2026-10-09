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
