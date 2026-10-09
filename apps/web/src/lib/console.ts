import 'server-only';

import type { InventoryScope, SessionContext } from '@cp/api';
import { isAdmin } from '@cp/core';
import { notFound, redirect } from 'next/navigation';

import { getSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export interface ConsoleContext {
  ctx: SessionContext;
  supabase: Awaited<ReturnType<typeof createClient>>;
  isAdmin: boolean;
  /** Admins see every dealer's inventory; members see their dealers'. */
  scope: InventoryScope;
  /** Dealers the user is a member of (any role). */
  memberDealerIds: string[];
  /** Dealers the user can administer (owner/manager). */
  managedDealerIds: string[];
}

/** Console pages and actions: requires a signed-in admin or dealer member (RLS still enforces data). */
export async function requireConsole(): Promise<ConsoleContext> {
  const ctx = await getSession();
  if (!ctx) redirect('/login?next=/dashboard');
  if (!ctx.canAccessConsole) redirect('/dashboard');
  const admin = isAdmin({ role: ctx.profile.role });
  const memberDealerIds = ctx.memberships.map((m) => m.dealerId);
  return {
    ctx,
    supabase: await createClient(),
    isAdmin: admin,
    scope: admin ? { kind: 'all' } : { kind: 'dealers', dealerIds: memberDealerIds },
    memberDealerIds,
    managedDealerIds: ctx.memberships
      .filter((m) => m.role === 'owner' || m.role === 'manager')
      .map((m) => m.dealerId),
  };
}

/** Admin-only console pages 404 for everyone else (don't reveal they exist). */
export async function requireAdmin(): Promise<ConsoleContext> {
  const console = await requireConsole();
  if (!console.isAdmin) notFound();
  return console;
}
