'use client';

import { GitCompareArrows } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useCompareStore } from '@/lib/stores/compare';

/** Header shortcut to /compare with the tray count (ids are shareable via ?ids=). */
export function CompareLink() {
  const ids = useCompareStore((s) => s.ids);
  const href = ids.length > 0 ? `/compare?ids=${ids.join(',')}` : '/compare';
  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href={href} aria-label={`Compare vehicles (${ids.length} selected)`}>
        <GitCompareArrows className="size-5" />
        {ids.length > 0 ? (
          <span className="bg-primary text-primary-foreground absolute top-1 right-1 grid size-4 place-items-center rounded-full text-[10px] font-semibold">
            {ids.length}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
