'use client';

import { CONSOLE_SORTS, type ConsoleSort } from '@cp/api';
import { listingStatusLabels } from '@cp/core';
import { Constants } from '@cp/types';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SORT_LABELS: Record<ConsoleSort, string> = {
  updated_desc: 'Recently updated',
  created_desc: 'Newest first',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
};

const ALL = 'all';

/** Search + filters for the console inventory table, kept in the URL so views are shareable. */
export function InventoryToolbar({ dealers }: { dealers: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get('q') ?? '');

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  // Debounced search.
  useEffect(() => {
    if ((params.get('q') ?? '') === q) return;
    const timer = setTimeout(() => update({ q: q.trim() || null }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed value should trigger
  }, [q]);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <div className="relative min-w-56 flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search make, model, VIN or stock #"
          aria-label="Search inventory"
          className="pl-9"
        />
      </div>
      <Select
        value={params.get('status') ?? ALL}
        onValueChange={(value) => update({ status: value === ALL ? null : value })}
      >
        <SelectTrigger className="w-40" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {Constants.public.Enums.listing_status.map((status) => (
            <SelectItem key={status} value={status}>
              {listingStatusLabels[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {dealers.length > 1 ? (
        <Select
          value={params.get('dealer') ?? ALL}
          onValueChange={(value) => update({ dealer: value === ALL ? null : value })}
        >
          <SelectTrigger className="w-48" aria-label="Filter by dealer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All dealers</SelectItem>
            {dealers.map((dealer) => (
              <SelectItem key={dealer.id} value={dealer.id}>
                {dealer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Select
        value={params.get('sort') ?? 'updated_desc'}
        onValueChange={(value) => update({ sort: value === 'updated_desc' ? null : value })}
      >
        <SelectTrigger className="w-48" aria-label="Sort">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONSOLE_SORTS.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
