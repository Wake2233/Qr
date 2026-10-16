import type { VehicleCard as VehicleCardData } from '@cp/api';
import type { Catalog } from '@cp/core';
import { ArrowRight, BadgeDollarSign, ClipboardList, MessageCircle } from 'lucide-react';
import Link from 'next/link';

import { BodyTypeTiles } from '@/components/home/body-type-tiles';
import { HeroSearch } from '@/components/home/hero-search';
import { Spotlight } from '@/components/home/spotlight';
import { Button } from '@/components/ui/button';
import { VehicleCard } from '@/components/vehicle/vehicle-card';
import { VehicleRail } from '@/components/vehicle/vehicle-rail';
import { getSiteInfo } from '@/lib/site';
import { getHomeData, getStorefrontCatalog } from '@/lib/storefront';

const TRUST = [
  {
    icon: BadgeDollarSign,
    title: 'The exact price, always',
    body: 'Every listing shows its real price — no “call for price”.',
  },
  {
    icon: ClipboardList,
    title: 'Full specs and history',
    body: 'Powertrain, features, owners, title and accident history up front.',
  },
  {
    icon: MessageCircle,
    title: 'Talk to a person',
    body: 'Message us on WhatsApp or call — no checkout, no runaround.',
  },
] as const;

export default async function HomePage() {
  const [{ settings }, home, catalog] = await Promise.all([
    getSiteInfo(),
    getHomeData(),
    getStorefrontCatalog(),
  ]);
  const total = home?.facets.total ?? null;

  return (
    <div className="space-y-20 pb-20">
      <section className="relative -mx-4 overflow-hidden px-4 pt-16 pb-12 sm:-mx-6 sm:px-6 sm:pt-24">
        <div
          aria-hidden
          className="from-primary/25 via-primary/5 pointer-events-none absolute inset-x-0 -top-40 h-[520px] bg-radial-[at_50%_0%] to-transparent blur-2xl"
        />
        {/* Slide only (no fade): the headline is the LCP element and must paint immediately. */}
        <div className="animate-in slide-in-from-bottom-4 relative max-w-4xl space-y-6 duration-700 motion-reduce:animate-none">
          <p className="text-primary text-sm font-medium tracking-widest uppercase">
            {total ? `${total} vehicles in stock` : settings.brand_name}
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
            Find the car you&apos;ll love driving.
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">
            Every listing shows the exact price and full specs. When you find the one, message us on
            WhatsApp or give us a call.
          </p>
        </div>
        <div className="relative mt-10 max-w-4xl">
          {home ? (
            <HeroSearch makes={home.facets.make} models={heroModels(catalog, home.facets.model)} />
          ) : (
            <Button asChild size="lg">
              <Link href="/inventory">
                Browse inventory <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </section>

      {home ? (
        <>
          <InStock cards={home.featured} total={home.facets.total} />
          <BodyTypeTiles counts={home.facets.body} />
          <VehicleRail
            title="Price drops"
            description="Recently reduced — the new price is shown on every card."
            cards={home.priceDrops}
          />
        </>
      ) : null}

      <section aria-labelledby="why-us" className="grid gap-4 md:grid-cols-3">
        <h2 id="why-us" className="sr-only">
          Why buy with us
        </h2>
        {TRUST.map(({ icon: Icon, title, body }) => (
          <div key={title} className="bg-card space-y-2 rounded-2xl border p-6">
            <Icon className="text-primary size-6" aria-hidden />
            <h3 className="font-semibold">{title}</h3>
            <p className="text-muted-foreground text-sm">{body}</p>
          </div>
        ))}
      </section>

      {home ? (
        <VehicleRail
          title="Recently sold"
          description="Sold in the last 30 days. Looking for something similar? Ask us."
          cards={home.recentlySold}
        />
      ) : null}

      <section className="bg-card relative overflow-hidden rounded-3xl border p-8 sm:p-12">
        <div className="max-w-2xl space-y-4">
          <MessageCircle className="text-primary size-8" aria-hidden />
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Looking for something specific?
          </h2>
          <p className="text-muted-foreground">
            Tell us the make, model and budget you have in mind. We&apos;ll let you know when the
            right car arrives.
          </p>
          <Button asChild size="lg">
            <Link href="/contact">
              Contact us <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

/**
 * The admin's pins in order (#1 is the spotlight), then every other car, newest first.
 * Nothing listed yet: nothing to show here (the hero and the contact block still are).
 */
function InStock({ cards, total }: { cards: VehicleCardData[]; total: number }) {
  const [spotlight, ...rest] = cards;
  if (!spotlight) return null;
  return (
    <div className="space-y-10">
      <Spotlight card={spotlight} />
      {rest.length > 0 ? (
        <section aria-labelledby="in-stock" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 id="in-stock" className="font-display text-2xl font-semibold tracking-tight">
                In stock now
              </h2>
              <p className="text-muted-foreground text-sm">
                Our picks first, then the newest arrivals.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/inventory">
                Browse all {total} <ArrowRight />
              </Link>
            </Button>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {rest.map((card) => (
              <li key={card.id}>
                <VehicleCard card={card} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Every catalog model, with stock counts where there are cars (facets only list those). */
function heroModels(
  catalog: Catalog | null,
  inStock: { value: string; label: string; make: string; count: number }[],
) {
  if (!catalog) return inStock;
  const counts = new Map(inStock.map((m) => [`${m.make}/${m.value}`, m.count]));
  return catalog.models.map((m) => ({
    value: m.slug,
    label: m.name,
    make: m.make,
    count: counts.get(`${m.make}/${m.slug}`) ?? 0,
  }));
}
