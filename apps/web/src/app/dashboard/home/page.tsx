import { listHomeBoard } from '@cp/api';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { HomeBoard } from '@/components/dashboard/admin/home-board';
import { PageHeader } from '@/components/dashboard/page-header';
import { TableSkeleton } from '@/components/dashboard/table-skeleton';
import { requireAdmin } from '@/lib/console';

export const metadata: Metadata = { title: 'Home page' };

export default function HomePageSettings() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Home page"
        description="Pin the cars buyers see first and drag them into order. #1 is the big spotlight car; every other car follows, newest first."
      />
      <Suspense fallback={<TableSkeleton />}>
        <Board />
      </Suspense>
    </div>
  );
}

async function Board() {
  const { supabase } = await requireAdmin();
  return <HomeBoard board={await listHomeBoard(supabase)} />;
}
