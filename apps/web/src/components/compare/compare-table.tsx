'use client';

import {
  buildCompareSections,
  compareHref,
  FEATURE_INCLUDED,
  formatPrice,
  onlyDifferences,
  vehicleImageAlt,
  type CompareInput,
} from '@cp/core';
import { Check, Minus, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ContactActions } from '@/components/vehicle/contact-actions';
import { useCompareStore } from '@/lib/stores/compare';
import { cn } from '@/lib/utils';

export interface CompareColumn extends CompareInput {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  coverAlt: string | null;
  status: string;
  contact: { whatsappE164: string | null; phoneE164: string | null; text: string };
}

/**
 * Side-by-side table (≤4). Rows that differ are highlighted; "Hide identical" keeps only
 * those. Removing a column updates the URL and the tray, so the link stays shareable.
 */
export function CompareTable({ columns }: { columns: CompareColumn[] }) {
  const router = useRouter();
  const switchId = useId();
  const [hideIdentical, setHideIdentical] = useState(false);
  const setTray = useCompareStore((s) => s.setIds);

  // Opening a shared link makes it the visitor's tray.
  const ids = columns.map((c) => c.id).join(',');
  useEffect(() => {
    setTray(ids ? ids.split(',') : []);
  }, [ids, setTray]);

  const all = buildCompareSections(columns);
  const sections = hideIdentical ? onlyDifferences(all) : all;
  const remove = (id: string) =>
    router.replace(compareHref(columns.filter((c) => c.id !== id).map((c) => c.id)), {
      scroll: false,
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Switch id={switchId} checked={hideIdentical} onCheckedChange={setHideIdentical} />
        <label htmlFor={switchId} className="text-sm font-medium">
          Hide identical rows
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
          <caption className="sr-only">
            Comparison of {columns.map((c) => c.title).join(', ')}. Highlighted rows differ.
          </caption>
          <colgroup>
            <col className="w-40 sm:w-48" />
            {columns.map((c) => (
              <col key={c.id} />
            ))}
          </colgroup>
          <thead className="bg-background/95 sticky top-16 z-10 backdrop-blur">
            <tr>
              <th scope="col" className="p-3 text-left align-bottom">
                <span className="sr-only">Spec</span>
              </th>
              {columns.map((c) => (
                <th key={c.id} scope="col" className="p-3 text-left align-top font-normal">
                  <div className="space-y-2">
                    <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-xl">
                      {c.coverUrl ? (
                        <Image
                          src={c.coverUrl}
                          alt={c.coverAlt ?? vehicleImageAlt(c.title, null, 0)}
                          fill
                          sizes="(min-width: 1024px) 22vw, 40vw"
                          className="object-cover"
                        />
                      ) : null}
                      <Button
                        size="icon"
                        variant="secondary"
                        className="bg-background/85 absolute top-2 right-2 size-8 rounded-full"
                        onClick={() => remove(c.id)}
                        aria-label={`Remove ${c.title} from compare`}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <Link
                      href={`/inventory/${c.slug}`}
                      className="block leading-tight font-semibold hover:underline"
                    >
                      {c.title}
                    </Link>
                    {c.price_cents !== null ? (
                      <p className="font-display text-xl font-semibold tabular-nums">
                        {formatPrice(c.price_cents)}
                      </p>
                    ) : null}
                    {c.status !== 'sold' ? (
                      <ContactActions
                        vehicleId={c.id}
                        whatsappE164={c.contact.whatsappE164}
                        phoneE164={c.contact.phoneE164}
                        text={c.contact.text}
                        variant="bar"
                        className="grid-cols-1 xl:grid-cols-2 [&_a]:h-10 [&_a]:text-sm"
                      />
                    ) : (
                      <p className="text-muted-foreground text-xs font-semibold uppercase">Sold</p>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          {sections.map((section) => (
            <tbody key={section.id}>
              <tr>
                <th
                  colSpan={columns.length + 1}
                  scope="colgroup"
                  className="bg-muted/60 px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase"
                >
                  {section.title}
                </th>
              </tr>
              {section.rows.map((row) => (
                <tr
                  key={row.key}
                  className={cn('border-t', row.differs && 'bg-primary/5')}
                  data-differs={row.differs || undefined}
                >
                  <th scope="row" className="text-muted-foreground p-3 text-left font-normal">
                    {row.label}
                  </th>
                  {row.values.map((value, i) => (
                    <td
                      key={columns[i]?.id ?? i}
                      className={cn('p-3', row.differs && 'font-medium')}
                    >
                      <CompareValue value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      {hideIdentical && sections.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm">
          These vehicles match on every listed spec.
        </p>
      ) : null}
    </div>
  );
}

function CompareValue({ value }: { value: string | null }) {
  if (value === null) {
    return (
      <span className="text-muted-foreground">
        <Minus className="size-4" aria-hidden />
        <span className="sr-only">Not listed</span>
      </span>
    );
  }
  if (value === FEATURE_INCLUDED) {
    return (
      <span className="text-primary">
        <Check className="size-4" aria-hidden />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  return <>{value}</>;
}
