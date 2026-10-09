import Link from 'next/link';

import { cn } from '@/lib/utils';

/** Wordmark until a logo is provided (brand name comes from site_settings). */
export function BrandMark({ name, className }: { name: string; className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        'font-display focus-visible:ring-ring/50 inline-flex items-center gap-2 rounded-md text-lg font-semibold tracking-tight whitespace-nowrap outline-none focus-visible:ring-[3px]',
        className,
      )}
    >
      <span
        aria-hidden
        className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg text-sm font-bold"
      >
        {name.trim().charAt(0).toUpperCase() || 'C'}
      </span>
      {name}
    </Link>
  );
}
