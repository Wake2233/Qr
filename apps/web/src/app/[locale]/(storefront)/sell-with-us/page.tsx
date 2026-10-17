import { BadgeCheck, Car, MessageCircle, Smartphone } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import NextLink from 'next/link';
import { Suspense } from 'react';

import { DealerStatusBadge } from '@/components/dashboard/status-badge';
import { DealerApplicationForm } from '@/components/dealer/dealer-application-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { localizedAlternates } from '@/lib/i18n';
import { getSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('SellWithUs')]);
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localizedAlternates(locale, '/sell-with-us'),
  };
}

const PERKS = [
  { icon: MessageCircle, key: 'perkLeads' },
  { icon: Smartphone, key: 'perkManage' },
  { icon: Car, key: 'perkListings' },
] as const;

const STEPS = ['step1', 'step2', 'step3'] as const;

export default async function SellWithUsPage() {
  const t = await getTranslations('SellWithUs');
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              {t('eyebrow')}
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {t('title')}
            </h1>
            <p className="text-muted-foreground text-lg">{t('lead')}</p>
          </div>
          <ul className="space-y-5">
            {PERKS.map(({ icon: Icon, key }) => (
              <li key={key} className="flex gap-4">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-medium">{t(`${key}Title`)}</p>
                  <p className="text-muted-foreground text-sm">{t(`${key}Body`)}</p>
                </div>
              </li>
            ))}
          </ul>
          <ol className="space-y-2 border-l pl-5">
            {STEPS.map((step, i) => (
              <li key={step} className="text-sm">
                <span className="text-muted-foreground mr-2 tabular-nums">{i + 1}.</span>
                {t(step)}
              </li>
            ))}
          </ol>
        </div>

        <Suspense fallback={<Skeleton className="h-[640px] w-full rounded-2xl" />}>
          <ApplicationPanel />
        </Suspense>
      </div>
    </div>
  );
}

async function ApplicationPanel() {
  const [ctx, t] = await Promise.all([getSession(), getTranslations('SellWithUs')]);
  if (!ctx) {
    return (
      <div className="bg-card flex flex-col items-start gap-4 rounded-2xl border p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold">{t('signInTitle')}</h2>
        <p className="text-muted-foreground">{t('signInBody')}</p>
        <Button asChild size="lg">
          <NextLink href="/login?next=/sell-with-us">{t('signInCta')}</NextLink>
        </Button>
      </div>
    );
  }

  const owned = ctx.memberships.filter((m) => m.role === 'owner');
  const pending = owned.find((m) => m.dealer.status === 'pending');
  const approved = ctx.memberships.find((m) => m.dealer.status === 'approved');

  if (pending || approved) {
    const membership = pending ?? approved;
    return (
      <div className="bg-card flex flex-col items-start gap-4 rounded-2xl border p-6 sm:p-8">
        <BadgeCheck className="text-primary size-10" />
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-semibold">{membership?.dealer.display_name}</h2>
          {membership ? <DealerStatusBadge status={membership.dealer.status} /> : null}
        </div>
        <p className="text-muted-foreground">{pending ? t('pending') : t('approved')}</p>
        <Button asChild size="lg">
          <NextLink href="/dashboard/inventory">{t('openConsole')}</NextLink>
        </Button>
      </div>
    );
  }

  // Previously rejected applicants see the reason and may apply again.
  const rejected = owned.find((m) => m.dealer.status === 'rejected');
  let reason: string | null = null;
  if (rejected) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('dealers')
      .select('rejection_reason')
      .eq('id', rejected.dealerId)
      .maybeSingle();
    reason = data?.rejection_reason ?? null;
  }

  return (
    <div className="space-y-4">
      {rejected ? (
        <div className="border-destructive/40 bg-destructive/5 rounded-xl border p-4 text-sm">
          <p className="font-medium">{t('rejected')}</p>
          {reason ? <p className="text-muted-foreground mt-1">{t('reason', { reason })}</p> : null}
        </div>
      ) : null}
      <DealerApplicationForm email={ctx.email} />
    </div>
  );
}
