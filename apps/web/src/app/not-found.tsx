import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4">
      <p className="text-primary text-sm font-medium tracking-widest uppercase">404</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        That page doesn&apos;t exist — or the vehicle has already found a new home.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/inventory">Browse inventory</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
