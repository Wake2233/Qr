import { listDealersForAdmin } from '@cp/api';
import { Constants, type Enums } from '@cp/types';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { PageHeader } from '@/components/dashboard/page-header';
import { DealerStatusBadge } from '@/components/dashboard/status-badge';
import { TableSkeleton } from '@/components/dashboard/table-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requireAdmin } from '@/lib/console';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dealers' };

type Status = Enums<'dealer_status'>;
const isStatus = (value: unknown): value is Status =>
  typeof value === 'string' &&
  (Constants.public.Enums.dealer_status as readonly string[]).includes(value);

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

export default function DealersPage({ searchParams }: PageProps<'/dashboard/dealers'>) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dealers"
        description="Review applications and manage partner dealerships. Pending applications are listed first."
      />
      <Suspense fallback={<TableSkeleton />}>
        <DealerQueue searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DealerQueue({
  searchParams,
}: {
  searchParams: PageProps<'/dashboard/dealers'>['searchParams'];
}) {
  const { status } = await searchParams;
  const filter = isStatus(status) ? status : undefined;
  const { supabase } = await requireAdmin();
  const [dealers, all] = await Promise.all([
    listDealersForAdmin(supabase, { status: filter }),
    filter ? listDealersForAdmin(supabase) : null,
  ]);
  const counts = (all ?? dealers).reduce<Partial<Record<Status, number>>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2" aria-label="Filter by status">
        {[undefined, ...Constants.public.Enums.dealer_status].map((s) => (
          <Link
            key={s ?? 'all'}
            href={s ? `/dashboard/dealers?status=${s}` : '/dashboard/dealers'}
            aria-current={filter === s ? 'page' : undefined}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm capitalize',
              filter === s ? 'bg-foreground text-background' : 'hover:bg-muted',
            )}
          >
            {s ?? 'All'}
            {s && counts[s] ? (
              <span className="ml-1.5 tabular-nums opacity-70">{counts[s]}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      {dealers.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border border-dashed p-10 text-center">
          No dealers {filter ? `with status “${filter}”` : 'yet'}.
        </p>
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dealer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Listings</TableHead>
                <TableHead className="hidden lg:table-cell">Applied</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dealers.map((dealer) => (
                <TableRow key={dealer.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/dealers/${dealer.id}`}
                      className="font-medium hover:underline"
                    >
                      {dealer.display_name}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {dealer.is_house ? 'House dealership' : (dealer.email ?? '—')}
                    </p>
                  </TableCell>
                  <TableCell>
                    <DealerStatusBadge status={dealer.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {[dealer.city, dealer.state].filter(Boolean).join(', ') || '—'}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {dealer.vehicle_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {dateFormat.format(new Date(dealer.created_at))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
