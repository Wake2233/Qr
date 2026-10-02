import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { PriceTag } from '@/components/vehicle/price-tag';

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex h-16 items-center justify-between">
        <span className="font-display text-lg font-semibold tracking-tight">Car Platform</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col justify-center gap-10 py-16">
        <div className="max-w-2xl space-y-5">
          <p className="text-primary text-sm font-medium tracking-widest uppercase">
            Phase 1 · Foundation
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
            Find the car you&apos;ll love driving.
          </h1>
          <p className="text-muted-foreground text-lg">
            Inventory, financing and dealer tools arrive in the coming phases. This page verifies
            the shared design tokens, theming and workspace packages.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg">Browse inventory</Button>
            <Button size="lg" variant="outline">
              Get pre-qualified
            </Button>
          </div>
        </div>

        <div className="bg-card text-card-foreground flex max-w-md items-center justify-between rounded-xl border p-5 shadow-sm">
          <div>
            <p className="font-medium">2021 BMW X5 xDrive40i</p>
            <p className="text-muted-foreground text-sm">Sample card · tokens check</p>
          </div>
          <PriceTag cents={4_599_000} />
        </div>
      </main>
    </div>
  );
}
