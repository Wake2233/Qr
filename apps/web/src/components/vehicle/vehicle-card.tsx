import type { VehicleCard as Card } from '@cp/api';
import {
  formatMileage,
  formatPrice,
  fuelTypeLabels,
  listingStatusLabels,
  priceDropCents,
  transmissionLabels,
  vehicleImageAlt,
} from '@cp/core';
import { Car, TrendingDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { blurhashDataUrl } from '@/lib/blurhash';
import { cn } from '@/lib/utils';

import { CompareToggle } from './compare-toggle';
import { FavoriteButton } from './favorite-button';

export const GRID_IMAGE_SIZES =
  '(min-width: 1536px) 22vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw';

interface VehicleCardProps {
  card: Card;
  /** above-the-fold cards load eagerly (LCP) */
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/** Inventory card. The whole card links to the VDP; save/compare sit above the link. */
export function VehicleCard({
  card,
  priority = false,
  sizes = GRID_IMAGE_SIZES,
  className,
}: VehicleCardProps) {
  const drop = priceDropCents(card.previous_price_cents, card.price_cents);
  const specs = [
    card.fuel_type ? fuelTypeLabels[card.fuel_type] : null,
    card.drivetrain ? card.drivetrain.toUpperCase() : null,
    card.transmission ? transmissionLabels[card.transmission] : null,
  ].filter((v): v is string => v !== null);
  const blur = blurhashDataUrl(card.cover_blurhash);
  const live = card.status === 'active';

  return (
    <article
      className={cn(
        'group bg-card focus-within:ring-ring/60 relative flex flex-col overflow-hidden rounded-2xl border transition duration-300 focus-within:ring-[3px] hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <div className="bg-muted relative aspect-[4/3] overflow-hidden">
        {card.cover_url ? (
          <Image
            src={card.cover_url}
            alt={card.cover_alt ?? vehicleImageAlt(card.title, null, 0)}
            fill
            sizes={sizes}
            priority={priority}
            placeholder={blur ? 'blur' : 'empty'}
            blurDataURL={blur}
            className="object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="text-muted-foreground grid h-full place-items-center">
            <Car className="size-10" aria-hidden />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {!live ? (
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm',
                card.status === 'sold'
                  ? 'bg-foreground text-background'
                  : 'bg-amber-400 text-amber-950',
              )}
            >
              {listingStatusLabels[card.status]}
            </span>
          ) : null}
          {drop && live ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              <TrendingDown className="size-3.5" aria-hidden /> {formatPrice(drop)} off
            </span>
          ) : null}
          {card.is_featured && live ? (
            <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm">
              Featured
            </span>
          ) : null}
        </div>
        {card.status !== 'sold' ? (
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
            <FavoriteButton vehicleId={card.id} title={card.title} />
            <CompareToggle vehicleId={card.id} title={card.title} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="font-display truncate text-lg leading-tight font-semibold">
            <Link
              href={`/inventory/${card.slug}`}
              className="outline-none after:absolute after:inset-0 after:content-['']"
            >
              {card.year} {card.make_name} {card.model_name}
            </Link>
          </h3>
          <p className="text-muted-foreground truncate text-sm">{card.trim ?? ' '}</p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            {card.price_cents !== null ? (
              <p className="font-display text-2xl font-semibold tabular-nums">
                {formatPrice(card.price_cents)}
              </p>
            ) : null}
            {drop && card.previous_price_cents !== null ? (
              <p className="text-muted-foreground text-xs tabular-nums line-through">
                {formatPrice(card.previous_price_cents)}
              </p>
            ) : null}
          </div>
          {card.mileage !== null ? (
            <p className="text-muted-foreground text-sm tabular-nums">
              {formatMileage(card.mileage)}
            </p>
          ) : null}
        </div>

        {specs.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Key specs">
            {specs.map((spec) => (
              <li key={spec} className="bg-muted rounded-md px-2 py-0.5 text-xs">
                {spec}
              </li>
            ))}
          </ul>
        ) : null}

        {card.dealer_name ? (
          <p className="text-muted-foreground mt-auto truncate text-xs">
            {card.dealer_is_house ? 'Sold by' : 'Listed by'} {card.dealer_name}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="bg-card overflow-hidden rounded-2xl border" aria-hidden>
      <div className="bg-muted aspect-[4/3] animate-pulse" />
      <div className="space-y-3 p-4">
        <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
        <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
        <div className="bg-muted h-7 w-1/3 animate-pulse rounded" />
      </div>
    </div>
  );
}
