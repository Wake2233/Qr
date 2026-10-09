import { CONSOLE_SORTS, listConsoleVehicles, type ConsoleSort } from '@cp/api';
import { Constants, type Enums } from '@cp/types';
import { CarFront, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { InventoryTable } from '@/components/dashboard/inventory/inventory-table';
import { InventoryToolbar } from '@/components/dashboard/inventory/inventory-toolbar';
import { PageHeader } from '@/components/dashboard/page-header';
import { Pagination } from '@/components/dashboard/pagination';
import { TableSkeleton } from '@/components/dashboard/table-skeleton';
import { Button } from '@/components/ui/button';
import { requireConsole } from '@/lib/console';

export const metadata: Metadata = { title: 'Inventory' };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const isStatus = (value: string | undefined): value is Enums<'listing_status'> =>
  (Constants.public.Enums.listing_status as readonly string[]).includes(value ?? '');
const isSort = (value: string | undefined): value is ConsoleSort =>
  (CONSOLE_SORTS as readonly string[]).includes(value ?? '');

export default function InventoryPage({ searchParams }: PageProps<'/dashboard/inventory'>) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Every listing you manage, including drafts. Click a price to edit it in place."
        actions={
          <Button asChild>
            <Link href="/dashboard/inventory/new">
              <Plus /> Add vehicle
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<TableSkeleton />}>
        <InventoryResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function InventoryResults({
  searchParams,
}: {
  searchParams: PageProps<'/dashboard/inventory'>['searchParams'];
}) {
  const raw = await searchParams;
  const { supabase, scope, isAdmin, ctx } = await requireConsole();

  const status = first(raw.status);
  const sort = first(raw.sort);
  const filters = {
    q: first(raw.q)?.slice(0, 100),
    status: isStatus(status) ? status : undefined,
    dealerId: first(raw.dealer),
    sort: isSort(sort) ? sort : undefined,
    page: Math.max(1, Number.parseInt(first(raw.page) ?? '1', 10) || 1),
  };

  const [page, dealers] = await Promise.all([
    listConsoleVehicles(supabase, scope, filters),
    isAdmin
      ? supabase
          .from('dealers')
          .select('id, display_name')
          .order('display_name')
          .then(({ data }) => (data ?? []).map((d) => ({ id: d.id, name: d.display_name })))
      : Promise.resolve(
          ctx.memberships.map((m) => ({ id: m.dealerId, name: m.dealer.display_name })),
        ),
  ]);

  const filtered = Boolean(filters.q || filters.status || filters.dealerId);

  return (
    <div className="space-y-4">
      <InventoryToolbar dealers={dealers} />
      {page.items.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <CarFront className="text-muted-foreground size-10" />
          <p className="font-medium">
            {filtered ? 'No listings match these filters' : 'No listings yet'}
          </p>
          <p className="text-muted-foreground max-w-sm text-sm">
            {filtered
              ? 'Try a different search or clear the filters.'
              : 'Add your first vehicle. It stays a draft until you publish it.'}
          </p>
          <Button asChild variant={filtered ? 'outline' : 'default'}>
            <Link href={filtered ? '/dashboard/inventory' : '/dashboard/inventory/new'}>
              {filtered ? 'Clear filters' : 'Add vehicle'}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <InventoryTable rows={page.items} isAdmin={isAdmin} showDealer={dealers.length > 1} />
          <Pagination
            page={page.page}
            pageCount={page.pageCount}
            total={page.total}
            basePath="/dashboard/inventory"
            params={{
              q: filters.q,
              status: filters.status,
              dealer: filters.dealerId,
              sort: filters.sort,
            }}
          />
        </>
      )}
    </div>
  );
}
