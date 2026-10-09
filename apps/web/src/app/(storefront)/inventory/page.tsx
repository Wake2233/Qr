import { queryKeys } from '@cp/api';
import { parseInventoryFilters } from '@cp/core';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { InventoryBrowser } from '@/components/inventory/inventory-browser';
import { VehicleCardSkeleton } from '@/components/vehicle/vehicle-card';
import { facetFiltersOf, listFiltersOf } from '@/lib/inventory/filter-scopes';
import { getDealerName, getInventoryFacets, getInventoryPage } from '@/lib/storefront';

export const metadata: Metadata = {
  title: 'Inventory',
  description:
    'Search every vehicle with live filters. Each listing shows the exact price and full specs.',
  alternates: { canonical: '/inventory' },
};

export default function InventoryPage({ searchParams }: PageProps<'/inventory'>) {
  return (
    <div className="space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">
          Exact prices and full specs on every listing. Message us on WhatsApp or call about any
          car.
        </p>
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
  searchParams: PageProps<'/inventory'>['searchParams'];
}) {
  const filters = parseInventoryFilters(await searchParams);
  const listFilters = listFiltersOf(filters);
  const facetFilters = facetFiltersOf(filters);
  const [page, facets, dealerName] = await Promise.all([
    getInventoryPage(listFilters),
    getInventoryFacets(facetFilters),
    filters.dealer ? getDealerName(filters.dealer) : null,
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
