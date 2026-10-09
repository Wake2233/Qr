import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function ConsoleNotFound() {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-start gap-4 py-24">
      <p className="text-primary text-sm font-medium tracking-widest uppercase">404</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Section not found</h1>
      <p className="text-muted-foreground">
        It doesn&apos;t exist or isn&apos;t available to your account.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Back to overview</Link>
      </Button>
    </section>
  );
}
