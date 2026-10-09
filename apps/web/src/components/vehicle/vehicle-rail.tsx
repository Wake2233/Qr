import type { VehicleCard as Card } from '@cp/api';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { VehicleCard } from './vehicle-card';

interface VehicleRailProps {
  title: string;
  description?: string;
  cards: Card[];
  href?: string;
  linkLabel?: string;
}

/** Horizontally scrolling row of cards (scroll-snap; keyboard reachable via the links). */
export function VehicleRail({
  title,
  description,
  cards,
  href,
  linkLabel = 'See all',
}: VehicleRailProps) {
  if (cards.length === 0) return null;
  const headingId = `rail-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id={headingId} className="font-display text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          {description ? <p className="text-muted-foreground">{description}</p> : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="text-primary inline-flex shrink-0 items-center gap-1 text-sm font-medium hover:underline"
          >
            {linkLabel} <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory [scrollbar-width:thin] gap-4 overflow-x-auto scroll-smooth px-4 pb-4 sm:-mx-6 sm:px-6">
        {cards.map((card) => (
          <li key={card.id} className="w-[280px] shrink-0 snap-start sm:w-[320px]">
            <VehicleCard card={card} sizes="320px" className="h-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
