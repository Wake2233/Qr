import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { VehicleEditor } from '@/components/dashboard/inventory/vehicle-editor';
import { PageHeader } from '@/components/dashboard/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { requireConsole } from '@/lib/console';

import { loadEditorData } from '../editor-data';

export const metadata: Metadata = { title: 'Add vehicle' };

export default function NewVehiclePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add vehicle"
        description={
          <>
            Saved as a draft. Add photos, then publish.{' '}
            <Link href="/dashboard/inventory" className="underline underline-offset-4">
              Back to inventory
            </Link>
          </>
        }
      />
      <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
        <NewVehicleForm />
      </Suspense>
    </div>
  );
}

async function NewVehicleForm() {
  const console = await requireConsole();
  const { catalog, dealers } = await loadEditorData(console);
  if (dealers.length === 0) {
    return (
      <p className="text-muted-foreground">
        You need a dealership membership to add vehicles.{' '}
        <Link href="/sell-with-us" className="underline">
          Apply as a dealer
        </Link>
        .
      </p>
    );
  }
  return (
    <VehicleEditor vehicle={null} catalog={catalog} dealers={dealers} isAdmin={console.isAdmin} />
  );
}
