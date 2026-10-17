import type { VehicleCard } from '@cp/api';
import {
  coreDictionary,
  formatMileage,
  formatPrice,
  priceDropCents,
  vehicleImageAlt,
} from '@cp/core';
import { ArrowRight, Car, TrendingDown } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';

import { IntentLink } from '@/components/site/intent-link';
import { Button } from '@/components/ui/button';
import { FavoriteButton } from '@/components/vehicle/favorite-button';
import { blurhashDataUrl } from '@/lib/blurhash';

/** The #1 car on the home page: the admin's first pin, or the newest listing. */
export async function Spotlight({ card }: { card: VehicleCard }) {
  const [locale, t, price] = await Promise.all([
    getLocale(),
    getTranslations('Home'),
    getTranslations('Price'),
  ]);
  const d = coreDictionary(locale);
  const drop = priceDropCents(card.previous_price_cents, card.price_cents);
  const blur = blurhashDataUrl(card.cover_blurhash);
  const href = `/inventory/${card.slug}`;
  const facts = [
    card.mileage !== null ? formatMileage(card.mileage, locale) : null,
    card.fuel_type ? d.fuelType[card.fuel_type] : null,
    card.drivetrain ? d.drivetrain[card.drivetrain] : null,
    card.transmission ? d.transmission[card.transmission] : null,
  ].filter((v): v is string => v !== null);

  return (
    <section
      aria-labelledby="spotlight-title"
      className="bg-card grid overflow-hidden rounded-3xl border lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
    >
      <div className="bg-muted relative aspect-[16/10] lg:aspect-auto lg:min-h-[420px]">
        {card.cover_url ? (
          <Image
            src={card.cover_url}
            alt={card.cover_alt ?? vehicleImageAlt(card.title, null, 0, locale)}
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            placeholder={blur ? 'blur' : 'empty'}
            blurDataURL={blur}
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground grid h-full place-items-center">
            <Car className="size-14" aria-hidden />
          </div>
        )}
        <div className="absolute top-4 right-4">
          <FavoriteButton vehicleId={card.id} title={card.title} />
        </div>
      </div>

      <div className="flex flex-col justify-center gap-5 p-6 sm:p-8">
        <p className="text-primary text-xs font-semibold tracking-widest uppercase">
          {card.is_featured ? t('ourPick') : t('justArrived')}
        </p>
        <div className="space-y-1">
          <h2
            id="spotlight-title"
            className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
          >
            {card.year} {card.make_name} {card.model_name}
          </h2>
          {card.trim ? <p className="text-muted-foreground text-lg">{card.trim}</p> : null}
        </div>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          {card.price_cents !== null ? (
            <p className="font-display text-4xl font-semibold tabular-nums">
              {formatPrice(card.price_cents)}
            </p>
          ) : null}
          {drop && card.previous_price_cents !== null ? (
            <p className="flex items-center gap-2 pb-1 text-sm">
              <span className="text-muted-foreground tabular-nums line-through">
                {formatPrice(card.previous_price_cents)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
                <TrendingDown className="size-3.5" aria-hidden />{' '}
                {price('off', { amount: formatPrice(drop) })}
              </span>
            </p>
          ) : null}
        </div>
        {facts.length > 0 ? (
          <p className="text-muted-foreground text-sm">{facts.join(' · ')}</p>
        ) : null}
        <Button asChild size="lg" className="self-start">
          <IntentLink href={href}>
            {t('seeThisCar')} <ArrowRight />
          </IntentLink>
        </Button>
      </div>
    </section>
  );
}
