'use client';

import { useFacets, useInfiniteVehicles, type InventoryFacets } from '@cp/api';
import {
  activeFilterChips,
  clearFilters,
  countActiveFilters,
  SORT_OPTIONS,
  sortLabels,
  type InventoryFilters,
  type InventorySort,
} from '@cp/core';
import { Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { VehicleCard, VehicleCardSkeleton } from '@/components/vehicle/vehicle-card';
import { facetFiltersOf, listFiltersOf } from '@/lib/inventory/filter-scopes';
import { useInventoryFilters } from '@/lib/inventory/use-inventory-filters';
import { useMediaQuery } from '@/lib/use-media-query';

import { FilterPanel } from './filter-panel';

const SEARCH_DEBOUNCE_MS = 350;

/** Inventory search: URL-synced filters, live facet counts and an infinite grid. */
export function InventoryBrowser({ dealerLabels }: { dealerLabels?: Record<string, string> }) {
  const { supabase } = useAuth();
  const { filters, setFilters } = useInventoryFilters();
  const listFilters = useMemo(() => listFiltersOf(filters), [filters]);
  const facetFilters = useMemo(() => facetFiltersOf(filters), [filters]);

  const vehicles = useInfiniteVehicles(supabase, listFilters);
  const facets = useFacets(supabase, facetFilters);
  const total = facets.data?.total ?? vehicles.data?.pages[0]?.total;
  const cards = useMemo(
    () => vehicles.data?.pages.flatMap((page) => page.items) ?? [],
    [vehicles.data],
  );

  const labels = useMemo(() => labelsOf(facets.data, dealerLabels), [facets.data, dealerLabels]);
  const chips = activeFilterChips(filters, labels);
  const activeCount = countActiveFilters(filters);
  const desktop = useMediaQuery('(min-width: 1024px)');
  const firstPageCount = vehicles.data?.pages[0]?.items.length ?? 0;

  // Infinite scroll: load the next page when the sentinel nears the viewport. A callback
  // ref (state) re-attaches the observer whenever the sentinel element is replaced.
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = vehicles;
  useEffect(() => {
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void fetchNextPage();
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside
        aria-label="Filters"
        className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-2"
      >
        <h2 className="sr-only">Filters</h2>
        {/* Phones use the sheet; mounting the rail only on desktop keeps it out of their hydration. */}
        {desktop ? (
          <FilterPanel
            filters={filters}
            facets={facets.data}
            onChange={(next) => void setFilters(next)}
          />
        ) : (
          <FilterRailSkeleton />
        )}
      </aside>

      <div className="min-w-0 space-y-5">
        <h2 className="sr-only">Results</h2>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox
            value={filters.q ?? ''}
            // The first keystroke adds a history entry; refinements of that search replace it.
            onChange={(q) =>
              void setFilters(
                { ...listFilters, q: q || undefined },
                { replace: Boolean(filters.q) },
              )
            }
          />
          <MobileFilters
            filters={filters}
            facets={facets.data}
            total={total}
            activeCount={activeCount}
            onChange={(next) => void setFilters(next)}
          />
          <Select
            value={filters.sort ?? 'newest'}
            onValueChange={(sort) => {
              if (sort !== (filters.sort ?? 'newest'))
                void setFilters({ ...listFilters, sort: sort as InventorySort });
            }}
          >
            <SelectTrigger
              aria-label="Sort by"
              className="w-auto min-w-0 flex-1 sm:w-52 sm:flex-none"
            >
              <SelectValue>{sortLabels[filters.sort ?? 'newest']}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              {SORT_OPTIONS.map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {sortLabels[sort]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <p className="text-muted-foreground mr-2 text-sm">
            {total === undefined ? (
              'Loading vehicles…'
            ) : (
              <>
                <span className="text-foreground font-semibold tabular-nums">{total}</span>{' '}
                {total === 1 ? 'vehicle' : 'vehicles'}
              </>
            )}
          </p>
          {chips.map((chip) => (
            <Button
              key={chip.id}
              variant="secondary"
              size="sm"
              className="h-8 rounded-full"
              onClick={() => void setFilters(chip.next)}
              aria-label={`Remove filter: ${chip.label}`}
            >
              {chip.label} <X className="size-3.5" aria-hidden />
            </Button>
          ))}
          {chips.length > 1 ? (
            <Button
              variant="link"
              size="sm"
              className="h-8"
              onClick={() => void setFilters(clearFilters(filters))}
            >
              Clear all
            </Button>
          ) : null}
        </div>

        {vehicles.isPending ? (
          <Grid>
            {Array.from({ length: 6 }, (_, i) => (
              <VehicleCardSkeleton key={i} />
            ))}
          </Grid>
        ) : vehicles.isError ? (
          <EmptyState
            title="We couldn’t load the inventory"
            body="Check your connection and try again."
            action={<Button onClick={() => void vehicles.refetch()}>Try again</Button>}
          />
        ) : cards.length === 0 ? (
          <EmptyState
            title="No vehicles match these filters"
            body="Try removing a filter or widening the price and year range."
            action={
              activeCount > 0 ? (
                <Button onClick={() => void setFilters(clearFilters(filters))}>
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <Grid>
              {cards.map((card, index) => (
                <li
                  key={card.id}
                  // Server-rendered cards paint immediately (LCP); only later pages animate in.
                  className={
                    index < firstPageCount
                      ? undefined
                      : 'animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none'
                  }
                >
                  <VehicleCard card={card} priority={index < 3} className="h-full" />
                </li>
              ))}
            </Grid>
            <div ref={setSentinel} className="flex flex-col items-center gap-2 py-6">
              {hasNextPage ? (
                <Button
                  variant="outline"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? <Loader2 className="animate-spin" /> : null}
                  Show more vehicles
                </Button>
              ) : (
                <p className="text-muted-foreground text-sm">
                  You’ve seen all {cards.length} {cards.length === 1 ? 'vehicle' : 'vehicles'}.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function labelsOf(facets: InventoryFacets | undefined, dealer?: Record<string, string>) {
  const toMap = (items: { value: string; label: string }[] = []) =>
    Object.fromEntries(items.map((item) => [item.value, item.label]));
  return {
    make: toMap(facets?.make),
    model: toMap(facets?.model),
    feature: toMap(facets?.feature),
    dealer,
  };
}

function FilterRailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {[0, 1, 2, 3].map((group) => (
        <div key={group} className="space-y-3">
          <div className="bg-muted h-4 w-24 animate-pulse rounded" />
          <div className="bg-muted h-9 animate-pulse rounded-md" />
          <div className="bg-muted h-9 animate-pulse rounded-md" />
        </div>
      ))}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{children}</ul>;
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground max-w-md">{body}</p>
      {action}
    </div>
  );
}

/** Debounced text search; the URL updates with `replace` so typing doesn't flood history. */
function SearchBox({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // The URL changed elsewhere (chip removed, back button): adopt it.
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (draft.trim() === value) return;
    const timer = setTimeout(() => onChangeRef.current(draft.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, value]);

  return (
    <form
      role="search"
      className="relative min-w-0 flex-1 basis-64"
      onSubmit={(event) => {
        event.preventDefault();
        onChange(draft.trim());
      }}
    >
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search make, model, trim…"
        aria-label="Search inventory"
        className="h-10 pl-9"
        enterKeyHint="search"
      />
    </form>
  );
}

function MobileFilters({
  filters,
  facets,
  total,
  activeCount,
  onChange,
}: {
  filters: InventoryFilters;
  facets: InventoryFacets | undefined;
  total: number | undefined;
  activeCount: number;
  onChange: (next: InventoryFilters) => void;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal /> Filters
          {activeCount > 0 ? (
            <span className="bg-primary text-primary-foreground grid size-5 place-items-center rounded-full text-xs">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="flex h-[88dvh] flex-col gap-0 rounded-t-2xl p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Results update as you choose.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pt-5">
          <FilterPanel filters={filters} facets={facets} onChange={onChange} />
        </div>
        <SheetFooter className="flex-row border-t">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => onChange(clearFilters(filters))}
            disabled={activeCount === 0}
          >
            Clear
          </Button>
          <SheetClose asChild>
            <Button className="flex-1">
              {total === undefined ? 'Show results' : `Show ${total} results`}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
