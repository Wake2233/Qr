import { featureName, parseCompareIds, vehicleContact } from '@cp/core';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { CompareEmpty } from '@/components/compare/compare-empty';
import { CompareTable, type CompareColumn } from '@/components/compare/compare-table';
import { env } from '@/lib/env';
import { localizedPath } from '@/lib/i18n';
import { getSiteInfo } from '@/lib/site';
import { getCompareVehicles } from '@/lib/storefront';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Compare');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: true },
  };
}

export default async function ComparePage({ searchParams }: PageProps<'/[locale]/compare'>) {
  const t = await getTranslations('Compare');
  return (
    <div className="space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('lead')}</p>
      </header>
      <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-2xl" />}>
        <CompareResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CompareResults({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/compare'>['searchParams'];
}) {
  const ids = parseCompareIds((await searchParams).ids);
  if (ids.length === 0) return <CompareEmpty />;

  const [vehicles, { settings }, locale] = await Promise.all([
    getCompareVehicles(ids),
    getSiteInfo(),
    getLocale(),
  ]);
  if (vehicles.length === 0) return <CompareEmpty />;

  const columns: CompareColumn[] = vehicles.map((v) => {
    const cover = v.images[0];
    const path = localizedPath(locale, `/inventory/${v.slug ?? ''}`);
    const url = new URL(path, env.NEXT_PUBLIC_SITE_URL).href;
    return {
      ...v,
      features: v.features.map((f) => ({ name: featureName(f, locale) })),
      make: v.make.name,
      model: v.model.name,
      slug: v.slug ?? '',
      coverUrl: cover?.url ?? null,
      coverAlt: cover?.alt ?? null,
      contact: vehicleContact({ vehicle: v, dealer: v.dealer, settings, url }),
    };
  });
  return <CompareTable columns={columns} />;
}
