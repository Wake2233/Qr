import { DEFAULT_WHATSAPP_TEMPLATE, formatPhone } from '@cp/core';
import { aprByTierSchema, businessHoursSchema, type SiteSettingsInput } from '@cp/validators';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SiteSettingsForm } from '@/components/dashboard/admin/site-settings-form';
import { PageHeader } from '@/components/dashboard/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/console';

export const metadata: Metadata = { title: 'Site settings' };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Site settings"
        description="Brand, contact numbers, WhatsApp message, hours and financing."
      />
      <Suspense fallback={<Skeleton className="h-[70vh] w-full" />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  const initial: SiteSettingsInput = {
    brand_name: data.brand_name,
    default_phone_e164: data.default_phone_e164 ? formatPhone(data.default_phone_e164) : '',
    default_whatsapp_e164: data.default_whatsapp_e164
      ? formatPhone(data.default_whatsapp_e164)
      : '',
    whatsapp_template: data.whatsapp_template || DEFAULT_WHATSAPP_TEMPLATE,
    business_hours: businessHoursSchema.catch({}).parse(data.business_hours),
    apr_by_tier: aprByTierSchema.catch({}).parse(data.apr_by_tier),
    lender_network_size: data.lender_network_size,
    require_listing_review: data.require_listing_review,
  };
  return <SiteSettingsForm initial={initial} />;
}
