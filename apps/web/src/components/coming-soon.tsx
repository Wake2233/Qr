import { Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface ComingSoonProps {
  title: string;
  description: string;
  phase: number;
  backHref?: string;
  backLabel?: string;
}

/** Placeholder for routes that later phases fill in, so navigation never 404s. */
export function ComingSoon({
  title,
  description,
  phase,
  backHref = '/',
  backLabel = 'Back home',
}: ComingSoonProps) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-start gap-5 py-20">
      <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
        <Sparkles className="size-3.5" aria-hidden /> Arrives in Phase {phase}
      </span>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-balance">{title}</h1>
      <p className="text-muted-foreground text-lg">{description}</p>
      <Button asChild variant="outline">
        <Link href={backHref}>{backLabel}</Link>
      </Button>
    </section>
  );
}
