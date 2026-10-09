'use client';

import { useVehiclesByIds } from '@cp/api';
import { Heart } from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { VehicleCard, VehicleCardSkeleton } from '@/components/vehicle/vehicle-card';
import { useFavorites } from '@/lib/favorites/use-favorites';

/** The account's favorites when signed in; this browser's list otherwise. */
export function SavedVehicles() {
  const { supabase } = useAuth();
  const { ids, ready, signedIn } = useFavorites();
  const cards = useVehiclesByIds(supabase, ids);
  const loading = !ready || (ids.length > 0 && cards.isPending);
  const visible = cards.data ?? [];

  return (
    <div className="space-y-6">
      {ready && !signedIn ? (
        <div className="bg-muted/60 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm">
          <p>Saved on this device only. Sign in to keep them on every device.</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/login?next=/account/favorites">Sign in</Link>
          </Button>
        </div>
      ) : null}

      {loading ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <VehicleCardSkeleton />
            </li>
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-16 text-center">
          <Heart className="text-muted-foreground size-10" aria-hidden />
          <h2 className="font-display text-xl font-semibold">No saved vehicles yet</h2>
          <p className="text-muted-foreground max-w-sm">
            {ids.length > 0
              ? 'The vehicles you saved are no longer listed.'
              : 'Tap the heart on a listing to save it for later.'}
          </p>
          <Button asChild>
            <Link href="/inventory">Browse inventory</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visible.map((card) => (
            <li key={card.id}>
              <VehicleCard card={card} className="h-full" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
