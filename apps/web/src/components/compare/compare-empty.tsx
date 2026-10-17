'use client';

import { compareHref } from '@cp/core';
import { GitCompareArrows } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { useCompareStore } from '@/lib/stores/compare';

/** /compare without ids: open the visitor's tray if it has vehicles, else explain. */
export function CompareEmpty() {
  const router = useRouter();
  const t = useTranslations('Compare');
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
      <h2 className="font-display text-2xl font-semibold">{t('emptyTitle')}</h2>
      <p className="text-muted-foreground">{t('emptyBody')}</p>
      <Button asChild>
        <Link href="/inventory">{t('browse')}</Link>
      </Button>
    </div>
  );
}
