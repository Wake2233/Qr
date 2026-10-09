import { ArrowRight, BadgeDollarSign, ClipboardList, Landmark, MessageCircle } from 'lucide-react';
import Link from 'next/link';

import { BodyTypeTiles } from '@/components/home/body-type-tiles';
import { HeroSearch } from '@/components/home/hero-search';
import { Button } from '@/components/ui/button';
import { VehicleRail } from '@/components/vehicle/vehicle-rail';
import { getSiteInfo } from '@/lib/site';
import { getHomeData } from '@/lib/storefront';

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
  const [{ settings }, home] = await Promise.all([getSiteInfo(), getHomeData().catch(() => null)]);
  const total = home?.facets.total ?? null;

  return (
    <div className="space-y-20 pb-20">
      <section className="relative -mx-4 overflow-hidden px-4 pt-16 pb-12 sm:-mx-6 sm:px-6 sm:pt-24">
        <div
          aria-hidden
          className="from-primary/25 via-primary/5 pointer-events-none absolute inset-x-0 -top-40 h-[520px] bg-radial-[at_50%_0%] to-transparent blur-2xl"
        />
        <div className="animate-in fade-in slide-in-from-bottom-4 relative max-w-4xl space-y-6 duration-700 motion-reduce:animate-none">
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
            <HeroSearch makes={home.facets.make} models={home.facets.model} />
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
          <BodyTypeTiles counts={home.facets.body} />
          <VehicleRail
            title="Featured"
            description="Hand-picked from our current stock."
            cards={home.featured}
            href="/inventory"
            linkLabel="Browse all"
          />
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
          <Landmark className="text-primary size-8" aria-hidden />
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Know your payment before you visit
          </h2>
          <p className="text-muted-foreground">
            Estimate a monthly payment on any car, then pre-qualify
            {settings.lender_network_size > 0
              ? ` across our network of ${settings.lender_network_size.toLocaleString('en-US')}+ lenders`
              : ''}{' '}
            without affecting your credit.
          </p>
          <p className="text-muted-foreground text-xs">
            Offers are simulated pre-qualification estimates, not credit decisions.
          </p>
          <Button asChild size="lg">
            <Link href="/financing">
              Explore financing <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
