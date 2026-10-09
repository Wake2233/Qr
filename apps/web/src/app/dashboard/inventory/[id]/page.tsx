import { getConsoleVehicle } from '@cp/api';
import { uuidSchema } from '@cp/validators';
import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { PhotoManager } from '@/components/dashboard/inventory/photo-manager';
import { VehicleEditor } from '@/components/dashboard/inventory/vehicle-editor';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { requireConsole } from '@/lib/console';

import { loadEditorData } from '../editor-data';

export const metadata: Metadata = { title: 'Edit vehicle' };

export default function EditVehiclePage({ params }: PageProps<'/dashboard/inventory/[id]'>) {
  return (
    <Suspense fallback={<Skeleton className="h-[70vh] w-full" />}>
      <EditVehicle params={params} />
    </Suspense>
  );
}

async function EditVehicle({
  params,
}: {
  params: PageProps<'/dashboard/inventory/[id]'>['params'];
}) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const console = await requireConsole();
  const [vehicle, { catalog, dealers }] = await Promise.all([
    getConsoleVehicle(console.supabase, id),
    loadEditorData(console),
  ]);
  // RLS lets anyone read live listings; only the owning dealer's members (or admins) may edit.
  if (!vehicle || (!console.isAdmin && !console.memberDealerIds.includes(vehicle.dealer_id))) {
    notFound();
  }
  // Keep the listing's own dealer selectable for admins even if not in the list.
  const dealerOptions = dealers.some((d) => d.id === vehicle.dealer_id)
    ? dealers
    : [
        { id: vehicle.dealer.id, name: vehicle.dealer.display_name, status: vehicle.dealer.status },
        ...dealers,
      ];
  const live =
    ['active', 'reserved', 'sold'].includes(vehicle.status) && vehicle.dealer.status === 'approved';

  return (
    <div className="space-y-6">
      <PageHeader
        title={vehicle.title}
        description={
          <>
            {vehicle.dealer.display_name}
            {vehicle.stock_number ? ` · Stock #${vehicle.stock_number}` : ''} ·{' '}
            <Link href="/dashboard/inventory" className="underline underline-offset-4">
              Back to inventory
            </Link>
          </>
        }
        actions={
          live && vehicle.slug ? (
            <Button asChild variant="outline">
              <Link href={`/inventory/${vehicle.slug}`} target="_blank">
                <ExternalLink /> View on site
              </Link>
            </Button>
          ) : null
        }
      />
      <VehicleEditor
        key={vehicle.updated_at}
        vehicle={vehicle}
        catalog={catalog}
        dealers={dealerOptions}
        isAdmin={console.isAdmin}
        photos={
          <PhotoManager
            vehicleId={vehicle.id}
            dealerId={vehicle.dealer_id}
            title={vehicle.title}
            images={vehicle.images}
          />
        }
      />
    </div>
  );
}
