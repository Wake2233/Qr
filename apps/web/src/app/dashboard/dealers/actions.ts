'use server';

import { moderateDealer } from '@cp/api';
import type { ActionResult } from '@cp/types';
import { dealerModerationSchema } from '@cp/validators';

import { attempt, invalidInput } from '@/lib/action-result';
import { requireAdmin } from '@/lib/console';
import { revalidateInventory } from '@/lib/revalidate';

/** Approve / reject / suspend. Suspension hides every listing immediately (RLS). */
export async function moderateDealerAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = dealerModerationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error, parsed.error.issues[0]?.message);
  const { supabase } = await requireAdmin();
  const result = await attempt(async () => {
    await moderateDealer(supabase, parsed.data);
    return null;
  });
  // Dealer status changes which listings are public.
  if (result.ok) revalidateInventory();
  return result;
}
