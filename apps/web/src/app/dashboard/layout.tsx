import { consoleNavItems } from '@cp/core';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

import { SignOutButton } from '@/components/auth/sign-out-button';
import { ConsoleMobileNav } from '@/components/dashboard/console-mobile-nav';
import { ConsoleSidebar } from '@/components/dashboard/console-sidebar';
import { ConsoleSkeleton } from '@/components/dashboard/console-skeleton';
import { BrandMark } from '@/components/site/brand-mark';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/session';
import { getSiteInfo } from '@/lib/site';

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  // The session is a request-time read, so the console streams in behind a skeleton.
  return (
    <Suspense fallback={<ConsoleSkeleton />}>
      <ConsoleShell>{children}</ConsoleShell>
    </Suspense>
  );
}

/** Console gate: signed-in admins and dealer members only (UI gate; RLS enforces data access). */
async function ConsoleShell({ children }: { children: ReactNode }) {
  const [ctx, { settings }] = await Promise.all([getSession(), getSiteInfo()]);
  if (!ctx) redirect('/login?next=/dashboard');

  if (!ctx.canAccessConsole) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="font-display text-2xl font-semibold">No dealer access</h1>
        <p className="text-muted-foreground">
          The dashboard is for approved dealers and admins. Want to list your inventory?
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/sell-with-us">Apply as a dealer</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to the store</Link>
          </Button>
          <SignOutButton variant="ghost" />
        </div>
      </main>
    );
  }

  const items = consoleNavItems({
    role: ctx.profile.role,
    memberships: ctx.memberships.map((m) => m.role),
  });

  return (
    <div className="flex min-h-dvh">
      <aside className="bg-sidebar text-sidebar-foreground sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 overflow-y-auto border-r p-4 lg:flex">
        <BrandMark name={settings.brand_name} className="px-2" />
        <ConsoleSidebar items={items} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-4 backdrop-blur-xl sm:px-6">
          <ConsoleMobileNav items={items} />
          <span className="font-display font-semibold tracking-tight lg:hidden">Console</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground hidden text-sm sm:inline">{ctx.email}</span>
            <Button asChild variant="ghost" size="sm">
              <Link href="/">View store</Link>
            </Button>
            <ThemeToggle />
            <SignOutButton variant="outline" size="sm" />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
