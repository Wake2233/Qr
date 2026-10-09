'use server';

import { setUserRole } from '@cp/api';
import { Constants, type ActionResult } from '@cp/types';
import { uuidSchema } from '@cp/validators';
import { refresh } from 'next/cache';
import { z } from 'zod';

import { attempt, invalidInput } from '@/lib/action-result';
import { requireAdmin } from '@/lib/console';

export async function changeUserRole(input: unknown): Promise<ActionResult<null>> {
  const parsed = z
    .object({ userId: uuidSchema, role: z.enum(Constants.public.Enums.app_role) })
    .safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error, 'Invalid role');
  const { supabase } = await requireAdmin();
  const result = await attempt(async () => {
    await setUserRole(supabase, parsed.data.userId, parsed.data.role);
    return null;
  });
  if (result.ok) refresh();
  return result;
}
