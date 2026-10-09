import { dealerLogoUrl, listSitemapVehicles } from '@cp/api';
import {
  formatMileage,
  formatPrice,
  listingStatusLabels,
  priceDropCents,
  vehicleContact,
} from '@cp/core';
import { ChevronRight, TrendingDown } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { CompareToggle } from '@/components/vehicle/compare-toggle';
import { ContactActions } from '@/components/vehicle/contact-actions';
import { DealerCard } from '@/components/vehicle/dealer-card';
import { FavoriteButton } from '@/components/vehicle/favorite-button';
import { PaymentEstimate } from '@/components/vehicle/payment-estimate';
import { ShareButton } from '@/components/vehicle/share-button';
import { VehicleGallery } from '@/components/vehicle/vehicle-gallery';
import { VehicleRail } from '@/components/vehicle/vehicle-rail';
import { VehicleFeatures, VehicleSpecs } from '@/components/vehicle/vehicle-specs';
import { VehicleViewTracker } from '@/components/vehicle/vehicle-view-tracker';
import { env } from '@/lib/env';
import { serializeJsonLd, vehicleJsonLd } from '@/lib/json-ld';
import { getSiteInfo } from '@/lib/site';
import { getSimilarVehicles, getVehicle } from '@/lib/storefront';
import { createPublicClient } from '@/lib/supabase/public';
import { cn } from '@/lib/utils';

const vehicleUrl = (slug: string) => new URL(`/inventory/${slug}`, env.NEXT_PUBLIC_SITE_URL).href;

const PREBUILT_LIMIT = 500;

/**
 * Prebuilds the newest live listings so their pages (and metadata, in <head>) are static.
 * Listings published after the build render on their first request.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const vehicles = await listSitemapVehicles(createPublicClient());
    if (vehicles.length > 0) return vehicles.slice(0, PREBUILT_LIMIT).map(({ slug }) => ({ slug }));
  } catch (error) {
    console.error('[inventory] listings unavailable at build time:', error);
  }
  // Cache Components needs at least one param; a build without a database prebuilds a 404.
  return [{ slug: 'unavailable' }];
}

export async function generateMetadata({
  params,
}: PageProps<'/inventory/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);
  if (!vehicle) return { title: 'Vehicle not found', robots: { index: false } };
  const price = vehicle.price_cents === null ? null : formatPrice(vehicle.price_cents);
  const facts = [
    price,
    vehicle.mileage === null ? null : formatMileage(vehicle.mileage),
    vehicle.exterior_color,
    vehicle.stock_number ? `Stock #${vehicle.stock_number}` : null,
  ].filter(Boolean);
  const description = `${vehicle.title}: ${facts.join(' · ')}. Full specs and photos — message us on WhatsApp or call.`;
  return {
    title: price ? `${vehicle.title} – ${price}` : vehicle.title,
    description,
    alternates: { canonical: `/inventory/${slug}` },
    openGraph: { type: 'website', title: vehicle.title, description, url: vehicleUrl(slug) },
    twitter: { card: 'summary_large_image', title: vehicle.title, description },
  };
}

export default function VehiclePage({ params }: PageProps<'/inventory/[slug]'>) {
  return (
    <Suspense fallback={<VehicleSkeleton />}>
      {params.then(({ slug }) => (
        <VehicleDetailView slug={slug} />
      ))}
    </Suspense>
  );
}

async function VehicleDetailView({ slug }: { slug: string }) {
  const [vehicle, { settings }] = await Promise.all([getVehicle(slug), getSiteInfo()]);
  if (!vehicle) notFound();

  const url = vehicleUrl(slug);
  const contact = vehicleContact({ vehicle, dealer: vehicle.dealer, settings, url });
  const drop = priceDropCents(vehicle.previous_price_cents, vehicle.price_cents);
  const sold = vehicle.status === 'sold';
  const dealer = vehicle.dealer
    ? { ...vehicle.dealer, logo_url: dealerLogoUrl(createPublicClient(), vehicle.dealer.logo_path) }
    : null;
  const specSource = { ...vehicle, make: vehicle.make.name, model: vehicle.model.name };
  const similar =
    vehicle.price_cents === null
      ? []
      : await getSimilarVehicles({
          id: vehicle.id,
          makeId: vehicle.make.id,
          bodyType: vehicle.body_type,
          priceCents: vehicle.price_cents,
        });
  const highlights = [
    vehicle.mileage === null ? null : formatMileage(vehicle.mileage),
    vehicle.exterior_color,
    vehicle.stock_number ? `Stock #${vehicle.stock_number}` : null,
  ].filter((v): v is string => Boolean(v));

  return (
    <article className="space-y-12 pt-6 pb-32 lg:pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(vehicleJsonLd(vehicle, url)) }}
      />
      <VehicleViewTracker vehicleId={vehicle.id} />

      <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/inventory" className="hover:text-foreground">
              Inventory
            </Link>
          </li>
          <ChevronRight className="size-3.5" aria-hidden />
          <li>
            <Link href={`/inventory?make=${vehicle.make.slug}`} className="hover:text-foreground">
              {vehicle.make.name}
            </Link>
          </li>
          <ChevronRight className="size-3.5" aria-hidden />
          <li aria-current="page" className="text-foreground truncate">
            {vehicle.title}
          </li>
        </ol>
      </nav>

      {/*
        Phones read top to bottom: photos → title, price and actions → specs → estimate and dealer.
        From lg the summary column is sticky beside the photos and specs.
      */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-10">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <VehicleGallery
            title={vehicle.title}
            images={vehicle.images.map((image) => ({
              id: image.id,
              url: image.url,
              width: image.width,
              height: image.height,
              blurhash: image.blurhash,
              alt: image.alt,
            }))}
          />
        </div>
        <div className="order-3 min-w-0 space-y-10 lg:order-none lg:col-start-1 lg:row-start-2">
          <VehicleSpecs vehicle={specSource} />
          <VehicleFeatures features={vehicle.features} />
          {vehicle.description ? (
            <section aria-labelledby="description-title" className="space-y-3">
              <h2
                id="description-title"
                className="font-display text-2xl font-semibold tracking-tight"
              >
                About this vehicle
              </h2>
              <p className="text-muted-foreground max-w-prose leading-relaxed whitespace-pre-line">
                {vehicle.description}
              </p>
            </section>
          ) : null}
        </div>

        <div className="contents lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block lg:space-y-5 lg:self-start">
          <section aria-label="Price and contact" className="order-2 space-y-5 lg:order-none">
            <div className="space-y-3">
              {vehicle.status !== 'active' ? (
                <span
                  className={cn(
                    'inline-block rounded-full px-3 py-1 text-xs font-semibold',
                    sold ? 'bg-foreground text-background' : 'bg-amber-400 text-amber-950',
                  )}
                >
                  {listingStatusLabels[vehicle.status]}
                </span>
              ) : null}
              <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance">
                {vehicle.year} {vehicle.make.name} {vehicle.model.name}
                {vehicle.trim ? (
                  <span className="text-muted-foreground block text-xl font-medium">
                    {vehicle.trim}
                  </span>
                ) : null}
              </h1>
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                {vehicle.price_cents !== null ? (
                  <p
                    className="font-display text-4xl font-semibold tabular-nums"
                    data-testid="vdp-price"
                  >
                    {formatPrice(vehicle.price_cents)}
                  </p>
                ) : null}
                {drop && vehicle.previous_price_cents !== null ? (
                  <p className="flex items-center gap-2 pb-1 text-sm">
                    <span className="text-muted-foreground tabular-nums line-through">
                      {formatPrice(vehicle.previous_price_cents)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
                      <TrendingDown className="size-3.5" aria-hidden /> Price drop{' '}
                      {formatPrice(drop)}
                    </span>
                  </p>
                ) : null}
              </div>
              {vehicle.msrp_cents !== null ? (
                <p className="text-muted-foreground text-sm">
                  Original MSRP {formatPrice(vehicle.msrp_cents)}
                </p>
              ) : null}
              {highlights.length > 0 ? (
                <p className="text-muted-foreground text-sm">{highlights.join(' · ')}</p>
              ) : null}
            </div>

            {sold ? (
              <div className="bg-muted space-y-3 rounded-2xl p-5">
                <p className="font-medium">This vehicle has been sold.</p>
                <p className="text-muted-foreground text-sm">
                  Take a look at similar vehicles below, or tell us what you’re looking for.
                </p>
                <ContactActions
                  vehicleId={vehicle.id}
                  whatsappE164={contact.whatsappE164}
                  phoneE164={contact.phoneE164}
                  text={`Hi! The ${vehicle.title} sold — do you have anything similar?`}
                />
              </div>
            ) : (
              <ContactActions
                vehicleId={vehicle.id}
                whatsappE164={contact.whatsappE164}
                phoneE164={contact.phoneE164}
                text={contact.text}
                className="hidden lg:grid"
              />
            )}

            <div className="flex flex-wrap gap-2">
              {!sold ? (
                <>
                  <FavoriteButton vehicleId={vehicle.id} title={vehicle.title} variant="outline" />
                  <CompareToggle vehicleId={vehicle.id} title={vehicle.title} variant="outline" />
                </>
              ) : null}
              <ShareButton title={vehicle.title} text={contact.text} url={url} />
            </div>
          </section>

          <div className="order-4 space-y-5 lg:order-none">
            {!sold && vehicle.price_cents !== null ? (
              <PaymentEstimate priceCents={vehicle.price_cents} aprByTier={settings.apr_by_tier} />
            ) : null}
            {dealer ? <DealerCard dealer={dealer} /> : null}
          </div>
        </div>
      </div>

      <VehicleRail
        title="Similar vehicles"
        description="Same body style or make, at a similar price."
        cards={similar}
        href={vehicle.body_type ? `/inventory?body=${vehicle.body_type}` : '/inventory'}
      />

      {!sold ? (
        <div className="bg-background/90 fixed inset-x-0 bottom-0 z-30 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            {vehicle.price_cents !== null ? (
              <p className="font-display shrink-0 text-lg font-semibold tabular-nums">
                {formatPrice(vehicle.price_cents)}
              </p>
            ) : null}
            <ContactActions
              vehicleId={vehicle.id}
              whatsappE164={contact.whatsappE164}
              phoneE164={contact.phoneE164}
              text={contact.text}
              variant="bar"
              className="flex-1"
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function VehicleSkeleton() {
  return (
    <div className="grid gap-8 pt-12 lg:grid-cols-[minmax(0,1fr)_400px]" aria-busy="true">
      <div className="bg-muted aspect-[4/3] animate-pulse rounded-2xl" />
      <div className="space-y-4">
        <div className="bg-muted h-9 w-3/4 animate-pulse rounded" />
        <div className="bg-muted h-10 w-1/3 animate-pulse rounded" />
        <div className="bg-muted h-12 animate-pulse rounded-lg" />
        <div className="bg-muted h-12 animate-pulse rounded-lg" />
      </div>
    </div>
  );
}
