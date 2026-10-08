import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getLiveInventoryCount, getSiteInfo } from '@/lib/site';

export default async function HomePage() {
  const [{ settings }, count] = await Promise.all([getSiteInfo(), getLiveInventoryCount()]);

  return (
    <section className="flex min-h-[70dvh] flex-col justify-center gap-8 py-20">
      <p className="text-primary text-sm font-medium tracking-widest uppercase">
        {count ? `${count} vehicles in stock` : settings.brand_name}
      </p>
      <h1 className="font-display max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
        Find the car you&apos;ll love driving.
      </h1>
      <p className="text-muted-foreground max-w-2xl text-lg">
        Every listing shows the exact price and full specs. When you find the one, message us on
        WhatsApp or give us a call — no checkout, no runaround.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/inventory">
            Browse inventory <ArrowRight />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/financing">Get pre-qualified</Link>
        </Button>
      </div>
    </section>
  );
}
