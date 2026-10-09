import { listCatalog } from '@cp/api';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CatalogManager } from '@/components/dashboard/admin/catalog-manager';
import { PageHeader } from '@/components/dashboard/page-header';
import { TableSkeleton } from '@/components/dashboard/table-skeleton';
import { requireAdmin } from '@/lib/console';

export const metadata: Metadata = { title: 'Catalog' };

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalog"
        description="Makes, models and features dealers pick from. Entries used by listings can’t be removed."
      />
      <Suspense fallback={<TableSkeleton />}>
        <Catalog />
      </Suspense>
    </div>
  );
}

async function Catalog() {
  const { supabase } = await requireAdmin();
  return <CatalogManager catalog={await listCatalog(supabase)} />;
}
