import { parseCompareIds, vehicleContact } from '@cp/core';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CompareEmpty } from '@/components/compare/compare-empty';
import { CompareTable, type CompareColumn } from '@/components/compare/compare-table';
import { env } from '@/lib/env';
import { getSiteInfo } from '@/lib/site';
import { getCompareVehicles } from '@/lib/storefront';

export const metadata: Metadata = {
  title: 'Compare vehicles',
  description: 'Line up to four vehicles side by side with the differences highlighted.',
  robots: { index: false, follow: true },
};

export default function ComparePage({ searchParams }: PageProps<'/compare'>) {
  return (
    <div className="space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Compare vehicles</h1>
        <p className="text-muted-foreground">
          Up to four vehicles side by side. Rows that differ are highlighted.
        </p>
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
  searchParams: PageProps<'/compare'>['searchParams'];
}) {
  const ids = parseCompareIds((await searchParams).ids);
  if (ids.length === 0) return <CompareEmpty />;

  const [vehicles, { settings }] = await Promise.all([getCompareVehicles(ids), getSiteInfo()]);
  if (vehicles.length === 0) return <CompareEmpty />;

  const columns: CompareColumn[] = vehicles.map((v) => {
    const cover = v.images[0];
    const url = new URL(`/inventory/${v.slug ?? ''}`, env.NEXT_PUBLIC_SITE_URL).href;
    return {
      ...v,
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
