import { dealerLogoUrl, getConsoleDealer } from '@cp/api';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { DealerProfileForm } from '@/components/dashboard/dealer/dealer-profile-form';
import { LogoUploader } from '@/components/dashboard/dealer/logo-uploader';
import { TeamManager } from '@/components/dashboard/dealer/team-manager';
import { PageHeader } from '@/components/dashboard/page-header';
import { DealerStatusBadge } from '@/components/dashboard/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { requireConsole } from '@/lib/console';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dealer profile' };

export default function DealerProfilePage({ searchParams }: PageProps<'/dashboard/dealer'>) {
  return (
    <Suspense fallback={<Skeleton className="h-[70vh] w-full" />}>
      <DealerProfile searchParams={searchParams} />
    </Suspense>
  );
}

async function DealerProfile({
  searchParams,
}: {
  searchParams: PageProps<'/dashboard/dealer'>['searchParams'];
}) {
  const { dealer: requested } = await searchParams;
  const { supabase, ctx, isAdmin } = await requireConsole();
  const managed = ctx.memberships.filter((m) => m.role === 'owner' || m.role === 'manager');
  if (managed.length === 0) notFound();
  const selected = managed.find((m) => m.dealerId === requested) ?? managed[0];
  if (!selected) notFound();

  const dealer = await getConsoleDealer(supabase, selected.dealerId);
  if (!dealer) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dealer profile"
        description="This is what buyers see on your listings: name, phone, WhatsApp, address and hours."
      />
      {managed.length > 1 ? (
        <nav className="flex flex-wrap gap-2" aria-label="Choose dealership">
          {managed.map((m) => (
            <Link
              key={m.dealerId}
              href={`/dashboard/dealer?dealer=${m.dealerId}`}
              aria-current={m.dealerId === selected.dealerId ? 'page' : undefined}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm',
                m.dealerId === selected.dealerId
                  ? 'bg-foreground text-background'
                  : 'hover:bg-muted',
              )}
            >
              {m.dealer.display_name}
            </Link>
          ))}
        </nav>
      ) : null}

      <section className="bg-card space-y-6 rounded-xl border p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <LogoUploader
            dealerId={dealer.id}
            dealerName={dealer.display_name}
            logoUrl={dealerLogoUrl(supabase, dealer.logo_path)}
          />
          <DealerStatusBadge status={dealer.status} />
        </div>
        <DealerProfileForm key={dealer.updated_at} dealer={dealer} />
      </section>

      <section className="bg-card space-y-4 rounded-xl border p-5 sm:p-6">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold">Team</h2>
          <p className="text-muted-foreground text-sm">
            Owners manage everything. Managers edit the profile and team. Staff manage inventory and
            leads.
          </p>
        </div>
        <TeamManager
          dealerId={dealer.id}
          team={dealer.team}
          currentUserId={ctx.userId}
          canAddOwners={isAdmin || selected.role === 'owner'}
        />
      </section>
    </div>
  );
}
