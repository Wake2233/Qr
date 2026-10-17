import type { VehicleCard as VehicleCardData } from '@cp/api';
import type { Catalog } from '@cp/core';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { BodyTypeTiles } from '@/components/home/body-type-tiles';
import { HeroSearch } from '@/components/home/hero-search';
import { Spotlight } from '@/components/home/spotlight';
import { Button } from '@/components/ui/button';
import { VehicleCard } from '@/components/vehicle/vehicle-card';
import { VehicleRail } from '@/components/vehicle/vehicle-rail';
import { Link } from '@/i18n/navigation';
import { localizedAlternates } from '@/lib/i18n';
import { getSiteInfo } from '@/lib/site';
import { getHomeData, getStorefrontCatalog } from '@/lib/storefront';

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: localizedAlternates(await getLocale(), '/') };
}

export default async function HomePage() {
  const [{ settings }, home, catalog, t] = await Promise.all([
    getSiteInfo(),
    getHomeData(),
    getStorefrontCatalog(),
    getTranslations('Home'),
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
            {total ? t('inStockCount', { count: total }) : settings.brand_name}
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
            {t('headline')}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">{t('lead')}</p>
        </div>
        <div className="relative mt-10 max-w-4xl">
          {home ? (
            <HeroSearch makes={home.facets.make} models={heroModels(catalog, home.facets.model)} />
          ) : (
            <Button asChild size="lg">
              <Link href="/inventory">
                {t('browseInventory')} <ArrowRight />
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
            title={t('priceDrops')}
            description={t('priceDropsDescription')}
            cards={home.priceDrops}
          />
        </>
      ) : null}

      {home ? (
        <VehicleRail
          title={t('recentlySold')}
          description={t('recentlySoldDescription')}
          cards={home.recentlySold}
        />
      ) : null}
    </div>
  );
}

/**
 * The admin's pins in order (#1 is the spotlight), then every other car, newest first.
 * Nothing listed yet: nothing to show here (the hero still is).
 */
async function InStock({ cards, total }: { cards: VehicleCardData[]; total: number }) {
  const t = await getTranslations('Home');
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
                {t('inStockNow')}
              </h2>
              <p className="text-muted-foreground text-sm">{t('inStockDescription')}</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/inventory">
                {t('browseAll', { count: total })} <ArrowRight />
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
