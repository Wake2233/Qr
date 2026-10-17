import { queryKeys } from '@cp/api';
import { parseInventoryFilters } from '@cp/core';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { InventoryBrowser } from '@/components/inventory/inventory-browser';
import { VehicleCardSkeleton } from '@/components/vehicle/vehicle-card';
import { localizedAlternates } from '@/lib/i18n';
import { facetFiltersOf, listFiltersOf } from '@/lib/inventory/filter-scopes';
import { getSiteInfo } from '@/lib/site';
import {
  getDealerName,
  getInventoryFacets,
  getInventoryPage,
  getStorefrontCatalog,
} from '@/lib/storefront';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('Inventory')]);
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localizedAlternates(locale, '/inventory'),
  };
}

export default async function InventoryPage({ searchParams }: PageProps<'/[locale]/inventory'>) {
  const t = await getTranslations('Inventory');
  return (
    <div className="space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('lead')}</p>
      </header>
      <Suspense fallback={<InventorySkeleton />}>
        <InventoryResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** First page + facet counts render on the server (SEO, no spinner); the client takes over. */
async function InventoryResults({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/inventory'>['searchParams'];
}) {
  const filters = parseInventoryFilters(await searchParams);
  const listFilters = listFiltersOf(filters);
  const facetFilters = facetFiltersOf(filters);
  const [page, facets, dealerName, catalog, { settings }] = await Promise.all([
    getInventoryPage(listFilters),
    getInventoryFacets(facetFilters),
    filters.dealer ? getDealerName(filters.dealer) : null,
    getStorefrontCatalog(),
    getSiteInfo(),
  ]);

  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.vehicles.infinite(listFilters), {
    pages: [page],
    pageParams: [1],
  });
  queryClient.setQueryData(queryKeys.vehicles.facets(facetFilters), facets);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InventoryBrowser
        dealerLabels={filters.dealer && dealerName ? { [filters.dealer]: dealerName } : undefined}
        catalog={catalog}
        contact={{
          whatsappE164: settings.default_whatsapp_e164,
          phoneE164: settings.default_phone_e164,
        }}
      />
    </HydrationBoundary>
  );
}

function InventorySkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]" aria-busy="true">
      <div className="hidden space-y-4 lg:block">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-muted h-24 animate-pulse rounded-xl" />
        ))}
      </div>
      <div className="space-y-5">
        <div className="bg-muted h-10 animate-pulse rounded-lg" />
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <VehicleCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
