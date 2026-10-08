'use client';

import { TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function ConsoleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section role="alert" className="mx-auto flex max-w-lg flex-col items-start gap-4 py-24">
      <TriangleAlert className="text-destructive size-8" aria-hidden />
      <h1 className="font-display text-2xl font-semibold">This section failed to load</h1>
      <p className="text-muted-foreground">
        Try again. Your changes are saved once you see a confirmation.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground text-xs">Reference: {error.digest}</p>
      ) : null}
      <Button onClick={() => retry()}>Try again</Button>
    </section>
  );
}
