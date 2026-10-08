import type { Metadata } from 'next';

import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Dashboard' };

const statusStyles: Record<string, string> = {
  approved: 'bg-success/15 text-success',
  pending: 'bg-warning/15 text-warning',
  rejected: 'bg-destructive/15 text-destructive',
  suspended: 'bg-destructive/15 text-destructive',
};

export default async function DashboardPage() {
  const ctx = await getSession();
  if (!ctx) return null;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Welcome{ctx.profile.full_name ? `, ${ctx.profile.full_name}` : ''}
        </h1>
        <p className="text-muted-foreground">
          Signed in as <span className="font-medium capitalize">{ctx.profile.role}</span>. Inventory
          tools arrive in Phase 4.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Your dealerships
        </h2>
        {ctx.memberships.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Admin account without a dealership membership.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {ctx.memberships.map((m) => (
              <li key={m.dealerId} className="bg-card rounded-xl border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{m.dealer.display_name}</p>
                    <p className="text-muted-foreground text-sm capitalize">{m.role}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[m.dealer.status] ?? ''}`}
                  >
                    {m.dealer.status}
                  </span>
                </div>
                {m.dealer.status === 'pending' ? (
                  <p className="text-muted-foreground mt-3 text-sm">
                    Awaiting admin approval. You can prepare draft listings, but publishing unlocks
                    once approved.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
