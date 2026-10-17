import { DEFAULT_WHATSAPP_TEMPLATE } from '@cp/core';

import type { AppSupabaseClient } from './client';

/** The single site_settings row, with defaults when it is missing. */
export async function getSiteSettings(client: AppSupabaseClient) {
  const { data, error } = await client
    .from('site_settings')
    .select(
      'brand_name, default_whatsapp_e164, default_phone_e164, whatsapp_template, require_listing_review',
    )
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return {
    brand_name: data?.brand_name ?? 'DG Auto',
    default_whatsapp_e164: data?.default_whatsapp_e164 ?? null,
    default_phone_e164: data?.default_phone_e164 ?? null,
    whatsapp_template: data?.whatsapp_template ?? DEFAULT_WHATSAPP_TEMPLATE,
    require_listing_review: data?.require_listing_review ?? false,
  };
}

export type SiteSettings = Awaited<ReturnType<typeof getSiteSettings>>;
