'use client';

import { compareHref } from '@cp/core';
import { GitCompareArrows } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { useCompareStore } from '@/lib/stores/compare';

/** /compare without ids: open the visitor's tray if it has vehicles, else explain. */
export function CompareEmpty() {
  const router = useRouter();
  const ids = useCompareStore((s) => s.ids);
  const hydrated = useSyncExternalStore(
    (onChange) => useCompareStore.persist.onFinishHydration(onChange),
    () => useCompareStore.persist.hasHydrated(),
    () => false,
  );

  useEffect(() => {
    if (ids.length > 0) router.replace(compareHref(ids));
  }, [ids, router]);

  if (!hydrated || ids.length > 0) return <div className="h-64" aria-busy="true" />;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <GitCompareArrows className="text-primary size-10" aria-hidden />
      <h2 className="font-display text-2xl font-semibold">Nothing to compare yet</h2>
      <p className="text-muted-foreground">
        Tap the compare icon on up to four vehicles and they’ll line up here side by side.
      </p>
      <Button asChild>
        <Link href="/inventory">Browse inventory</Link>
      </Button>
    </div>
  );
}
