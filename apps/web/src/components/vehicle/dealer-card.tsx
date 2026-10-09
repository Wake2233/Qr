import { formatPhone } from '@cp/core';
import { businessHoursSchema } from '@cp/validators';
import type { Json } from '@cp/types';
import { MapPin, Store } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BusinessHours } from '@/components/site/business-hours';

export interface DealerCardData {
  slug: string;
  display_name: string;
  is_house: boolean;
  logo_url: string | null;
  phone_e164: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  business_hours: Json;
}

export function DealerCard({ dealer }: { dealer: DealerCardData }) {
  const hours = businessHoursSchema.catch({}).parse(dealer.business_hours ?? {});
  const locality = [dealer.city, [dealer.state, dealer.postal_code].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return (
    <section aria-labelledby="dealer-title" className="bg-card space-y-4 rounded-2xl border p-5">
      <div className="flex items-center gap-3">
        <div className="bg-muted relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl">
          {dealer.logo_url ? (
            <Image src={dealer.logo_url} alt="" fill sizes="48px" className="object-contain" />
          ) : (
            <Store className="text-muted-foreground size-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">
            {dealer.is_house ? 'Sold by' : 'Listed by'}
          </p>
          <h2 id="dealer-title" className="truncate font-semibold">
            <Link href={`/dealers/${dealer.slug}`} className="hover:underline">
              {dealer.display_name}
            </Link>
          </h2>
        </div>
      </div>
      {dealer.address_line1 ? (
        <p className="text-muted-foreground flex gap-2 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {dealer.address_line1}
            {locality ? <>, {locality}</> : null}
          </span>
        </p>
      ) : null}
      {dealer.phone_e164 ? <p className="text-sm">{formatPhone(dealer.phone_e164)}</p> : null}
      {Object.keys(hours).length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Business hours</summary>
          <div className="mt-2">
            <BusinessHours hours={hours} />
          </div>
        </details>
      ) : null}
      <Link
        href={`/dealers/${dealer.slug}`}
        className="text-primary text-sm font-medium hover:underline"
      >
        See all vehicles from this dealer
      </Link>
    </section>
  );
}
