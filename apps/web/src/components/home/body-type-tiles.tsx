import { coreDictionary, inventoryHref } from '@cp/core';
import type { Enums } from '@cp/types';
import { getLocale, getTranslations } from 'next-intl/server';

import { IntentLink } from '@/components/site/intent-link';

const ORDER: Enums<'body_type'>[] = [
  'suv',
  'sedan',
  'pickup',
  'coupe',
  'hatchback',
  'convertible',
  'wagon',
  'minivan',
  'van',
];

/** Body-style shortcuts with live counts (only styles currently in stock). */
export async function BodyTypeTiles({ counts }: { counts: { value: string; count: number }[] }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('Home')]);
  const byType = new Map(counts.map((c) => [c.value, c.count]));
  const tiles = ORDER.filter((type) => (byType.get(type) ?? 0) > 0);
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="body-types" className="space-y-4">
      <h2 id="body-types" className="font-display text-2xl font-semibold tracking-tight">
        {t('shopByBody')}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((type) => (
          <li key={type}>
            <IntentLink
              href={inventoryHref({ body: [type] })}
              className="bg-card hover:border-primary/60 focus-visible:ring-ring/50 group flex h-full flex-col justify-between gap-6 rounded-2xl border p-5 transition outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-[3px] motion-reduce:hover:translate-y-0"
            >
              <span className="font-display text-lg font-semibold">
                {coreDictionary(locale).bodyType[type]}
              </span>
              <span className="text-muted-foreground text-sm tabular-nums">
                {t('bodyInStock', { count: byType.get(type) ?? 0 })}
              </span>
            </IntentLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
