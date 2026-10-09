'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { storefrontNav } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Nav links; `pathname` null = no active item (static fallback while the URL streams in). */
export function MainNavLinks({
  pathname,
  className,
}: {
  pathname: string | null;
  className?: string;
}) {
  return (
    <nav aria-label="Main" className={cn('items-center gap-1', className)}>
      {storefrontNav.map((item) => {
        const active = pathname !== null && isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'hover:text-foreground focus-visible:ring-ring/50 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Highlights the current section. Render inside <Suspense> (the pathname is runtime data). */
export function MainNav({ className }: { className?: string }) {
  return <MainNavLinks pathname={usePathname()} className={className} />;
}
