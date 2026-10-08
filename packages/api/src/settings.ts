import { DEFAULT_WHATSAPP_TEMPLATE } from '@cp/core';
import { aprByTierSchema, businessHoursSchema } from '@cp/validators';

import type { AppSupabaseClient } from './client';

/** The single site_settings row with its JSON columns parsed (invalid JSON → empty). */
export async function getSiteSettings(client: AppSupabaseClient) {
  const { data, error } = await client
    .from('site_settings')
    .select(
      'brand_name, default_whatsapp_e164, default_phone_e164, whatsapp_template, business_hours, apr_by_tier, lender_network_size, require_listing_review',
    )
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return {
    brand_name: data?.brand_name ?? 'Car Platform',
    default_whatsapp_e164: data?.default_whatsapp_e164 ?? null,
    default_phone_e164: data?.default_phone_e164 ?? null,
    whatsapp_template: data?.whatsapp_template ?? DEFAULT_WHATSAPP_TEMPLATE,
    business_hours: businessHoursSchema.catch({}).parse(data?.business_hours ?? {}),
    apr_by_tier: aprByTierSchema.catch({}).parse(data?.apr_by_tier ?? {}),
    lender_network_size: data?.lender_network_size ?? 0,
    require_listing_review: data?.require_listing_review ?? false,
  };
}

export type SiteSettings = Awaited<ReturnType<typeof getSiteSettings>>;
