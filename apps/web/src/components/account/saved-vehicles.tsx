'use client';

import { useVehiclesByIds } from '@cp/api';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import NextLink from 'next/link';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { VehicleCard, VehicleCardSkeleton } from '@/components/vehicle/vehicle-card';
import { Link } from '@/i18n/navigation';
import { useFavorites } from '@/lib/favorites/use-favorites';

/** The account's favorites when signed in; this browser's list otherwise. */
export function SavedVehicles() {
  const { supabase } = useAuth();
  const t = useTranslations('Saved');
  const { ids, ready, signedIn } = useFavorites();
  const cards = useVehiclesByIds(supabase, ids);
  const loading = !ready || (ids.length > 0 && cards.isPending);
  const visible = cards.data ?? [];

  return (
    <div className="space-y-6">
      {ready && !signedIn ? (
        <div className="bg-muted/60 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm">
          <p>{t('deviceOnly')}</p>
          <Button asChild size="sm" variant="outline">
            <NextLink href="/login?next=/account/favorites">{t('signIn')}</NextLink>
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
          <h2 className="font-display text-xl font-semibold">{t('emptyTitle')}</h2>
          <p className="text-muted-foreground max-w-sm">
            {ids.length > 0 ? t('noLongerListed') : t('emptyBody')}
          </p>
          <Button asChild>
            <Link href="/inventory">{t('browse')}</Link>
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
