'use client';

import { TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function StorefrontError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section role="alert" className="mx-auto flex max-w-lg flex-col items-start gap-4 py-24">
      <TriangleAlert className="text-destructive size-8" aria-hidden />
      <h1 className="font-display text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground">
        We couldn&apos;t load this page. Please try again — if it keeps happening, call or WhatsApp
        us.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground text-xs">Reference: {error.digest}</p>
      ) : null}
      <Button onClick={() => retry()}>Try again</Button>
    </section>
  );
}
