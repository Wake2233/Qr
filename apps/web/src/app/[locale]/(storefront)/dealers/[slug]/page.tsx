import { buildTelUrl, buildWhatsAppUrl, formatPhone, inventoryHref } from '@cp/core';
import { MapPin, MessageCircle, Phone, Store } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { VehicleCard, VehicleCardSkeleton } from '@/components/vehicle/vehicle-card';
import { Link } from '@/i18n/navigation';
import { localizedAlternates } from '@/lib/i18n';
import { getSiteInfo } from '@/lib/site';
import { getDealerStorefront } from '@/lib/storefront';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/dealers/[slug]'>): Promise<Metadata> {
  const [{ slug }, locale, t] = await Promise.all([params, getLocale(), getTranslations('Dealer')]);
  const storefront = await getDealerStorefront(slug);
  if (!storefront) return { title: t('notFound'), robots: { index: false } };
  const { dealer, inventory } = storefront;
  const name = dealer.city ? `${dealer.display_name} (${dealer.city})` : dealer.display_name;
  return {
    title: dealer.display_name,
    description: t('metaDescription', { count: inventory.total, dealer: name }),
    alternates: localizedAlternates(locale, `/dealers/${dealer.slug}`),
  };
}

export default function DealerPage({ params }: PageProps<'/[locale]/dealers/[slug]'>) {
  return (
    <Suspense fallback={<DealerSkeleton />}>
      {params.then(({ slug }) => (
        <DealerStorefrontView slug={slug} />
      ))}
    </Suspense>
  );
}

async function DealerStorefrontView({ slug }: { slug: string }) {
  const [storefront, { settings }, t] = await Promise.all([
    getDealerStorefront(slug),
    getSiteInfo(),
    getTranslations('Dealer'),
  ]);
  if (!storefront) notFound();
  const { dealer, inventory } = storefront;
  const whatsapp = dealer.whatsapp_e164 ?? settings.default_whatsapp_e164;
  const phone = dealer.phone_e164 ?? settings.default_phone_e164;
  const locality = [dealer.city, [dealer.state, dealer.postal_code].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-10 py-8">
      <header className="bg-card rounded-3xl border p-6 sm:p-8">
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
      </header>

      <section aria-labelledby="dealer-inventory" className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <h2 id="dealer-inventory" className="font-display text-2xl font-semibold tracking-tight">
            {t('forSale', { count: inventory.total })}
          </h2>
          {inventory.total > inventory.items.length ? (
            <Link
              href={inventoryHref({ dealer: dealer.slug })}
              className="text-primary text-sm font-medium hover:underline"
            >
              {t('searchAll')}
            </Link>
          ) : null}
        </div>
        {inventory.items.length === 0 ? (
          <p className="text-muted-foreground">{t('none')}</p>
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
