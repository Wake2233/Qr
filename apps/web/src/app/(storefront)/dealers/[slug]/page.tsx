import { buildTelUrl, buildWhatsAppUrl, formatPhone, inventoryHref } from '@cp/core';
import { businessHoursSchema } from '@cp/validators';
import { MapPin, MessageCircle, Phone, Store } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { BusinessHours } from '@/components/site/business-hours';
import { Button } from '@/components/ui/button';
import { VehicleCard, VehicleCardSkeleton } from '@/components/vehicle/vehicle-card';
import { getSiteInfo } from '@/lib/site';
import { getDealerStorefront } from '@/lib/storefront';

export async function generateMetadata({
  params,
}: PageProps<'/dealers/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const storefront = await getDealerStorefront(slug);
  if (!storefront) return { title: 'Dealer not found', robots: { index: false } };
  const { dealer, inventory } = storefront;
  return {
    title: dealer.display_name,
    description: `${inventory.total} vehicles from ${dealer.display_name}${dealer.city ? ` in ${dealer.city}` : ''}. Exact prices and full specs.`,
    alternates: { canonical: `/dealers/${dealer.slug}` },
  };
}

export default function DealerPage({ params }: PageProps<'/dealers/[slug]'>) {
  return (
    <Suspense fallback={<DealerSkeleton />}>
      {params.then(({ slug }) => (
        <DealerStorefrontView slug={slug} />
      ))}
    </Suspense>
  );
}

async function DealerStorefrontView({ slug }: { slug: string }) {
  const [storefront, { settings }] = await Promise.all([getDealerStorefront(slug), getSiteInfo()]);
  if (!storefront) notFound();
  const { dealer, inventory } = storefront;
  const hours = businessHoursSchema.catch({}).parse(dealer.business_hours ?? {});
  const whatsapp = dealer.whatsapp_e164 ?? settings.default_whatsapp_e164;
  const phone = dealer.phone_e164 ?? settings.default_phone_e164;
  const locality = [dealer.city, [dealer.state, dealer.postal_code].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-10 py-8">
      <header className="bg-card grid gap-6 rounded-3xl border p-6 sm:p-8 md:grid-cols-[1fr_auto]">
        <div className="flex gap-5">
          <div className="bg-muted relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl">
            {dealer.logo_url ? (
              <Image src={dealer.logo_url} alt="" fill sizes="80px" className="object-contain" />
            ) : (
              <Store className="text-muted-foreground size-8" aria-hidden />
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {dealer.display_name}
            </h1>
            {dealer.address_line1 ? (
              <p className="text-muted-foreground flex gap-2">
                <MapPin className="mt-1 size-4 shrink-0" aria-hidden />
                <span>
                  {dealer.address_line1}
                  {locality ? <>, {locality}</> : null}
                </span>
              </p>
            ) : null}
            {dealer.description ? (
              <p className="text-muted-foreground max-w-prose">{dealer.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              {whatsapp ? (
                <Button
                  asChild
                  className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
                >
                  <a href={buildWhatsAppUrl(whatsapp)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle /> WhatsApp
                  </a>
                </Button>
              ) : null}
              {phone ? (
                <Button asChild variant="outline">
                  <a href={buildTelUrl(phone)}>
                    <Phone /> {formatPhone(phone)}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        {Object.keys(hours).length > 0 ? (
          <div className="space-y-2 md:min-w-64">
            <h2 className="font-semibold">Hours</h2>
            <BusinessHours hours={hours} />
          </div>
        ) : null}
      </header>

      <section aria-labelledby="dealer-inventory" className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <h2 id="dealer-inventory" className="font-display text-2xl font-semibold tracking-tight">
            {inventory.total} {inventory.total === 1 ? 'vehicle' : 'vehicles'} for sale
          </h2>
          {inventory.total > inventory.items.length ? (
            <Link
              href={inventoryHref({ dealer: dealer.slug })}
              className="text-primary text-sm font-medium hover:underline"
            >
              Search all with filters
            </Link>
          ) : null}
        </div>
        {inventory.items.length === 0 ? (
          <p className="text-muted-foreground">No vehicles listed right now — check back soon.</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {inventory.items.map((card, index) => (
              <li key={card.id}>
                <VehicleCard card={card} priority={index < 3} className="h-full" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DealerSkeleton() {
  return (
    <div className="space-y-10 py-8" aria-busy="true">
      <div className="bg-muted h-48 animate-pulse rounded-3xl" />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i}>
            <VehicleCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
