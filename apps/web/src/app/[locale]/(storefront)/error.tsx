'use client';

import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export default function StorefrontError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations('Errors');
  return (
    <section role="alert" className="mx-auto flex max-w-lg flex-col items-start gap-4 py-24">
      <TriangleAlert className="text-destructive size-8" aria-hidden />
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground">{t('body')}</p>
      {error.digest ? (
        <p className="text-muted-foreground text-xs">{t('reference', { digest: error.digest })}</p>
      ) : null}
      <Button onClick={() => retry()}>{t('tryAgain')}</Button>
    </section>
  );
}
