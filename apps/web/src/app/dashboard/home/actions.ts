'use server';

import { setHomeOrder } from '@cp/api';
import type { ActionResult } from '@cp/types';
import { uuidSchema } from '@cp/validators';
import { z } from 'zod';

import { attempt, invalidInput } from '@/lib/action-result';
import { requireAdmin } from '@/lib/console';
import { revalidateInventory } from '@/lib/revalidate';

/** Saves the pinned list in display order (#1 = spotlight); listings left out are unpinned. */
export async function saveHomeOrder(input: unknown): Promise<ActionResult<number>> {
  const parsed = z.array(uuidSchema).max(100, 'Pin at most 100 cars').safeParse(input);
  if (!parsed.success) {
    return invalidInput('home.order', parsed.error, parsed.error.issues[0]?.message);
  }
  const { supabase } = await requireAdmin();
  const result = await attempt('home.order', () => setHomeOrder(supabase, parsed.data), {
    pinned: parsed.data.length,
  });
  if (result.ok) revalidateInventory();
  return result;
}
