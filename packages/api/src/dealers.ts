import type { AppSupabaseClient } from './client';

const PUBLIC_DEALER_COLUMNS =
  'id, slug, display_name, is_house, status, logo_path, phone_e164, whatsapp_e164, email, website, address_line1, city, state, postal_code, lat, lng, description, business_hours' as const;

/** Public dealer storefront data (RLS: approved dealers, or your own). */
export async function getDealerBySlug(client: AppSupabaseClient, slug: string) {
  const { data, error } = await client
    .from('dealers')
    .select(PUBLIC_DEALER_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** The platform's own dealership (address and numbers shown in the site footer). */
export async function getHouseDealer(client: AppSupabaseClient) {
  const { data, error } = await client
    .from('dealers')
    .select(PUBLIC_DEALER_COLUMNS)
    .eq('is_house', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
