import { getSessionContext } from '@cp/api';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { signOut } from '@/app/auth/actions';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';

/** Console gate: signed-in admins and dealer members only (UI gate; RLS enforces data access). */
export default async function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  const supabase = await createClient();
  const ctx = await getSessionContext(supabase);
  if (!ctx) redirect('/login?next=/dashboard');

  if (!ctx.canAccessConsole) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="font-display text-2xl font-semibold">No dealer access</h1>
        <p className="text-muted-foreground">
          The dashboard is for approved dealers and admins. Want to list your inventory?
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/">Back to the store</Link>
          </Button>
          <form action={signOut}>
            <Button variant="outline" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="flex h-16 items-center justify-between border-b px-4 sm:px-6">
        <Link href="/dashboard" className="font-display font-semibold tracking-tight">
          Car Platform · Console
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground hidden text-sm sm:inline">{ctx.email}</span>
          <ThemeToggle />
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
