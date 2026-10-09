'use server';

import { updateSiteSettings } from '@cp/api';
import type { ActionResult } from '@cp/types';
import { siteSettingsSchema } from '@cp/validators';

import { attempt, invalidInput } from '@/lib/action-result';
import { requireAdmin } from '@/lib/console';
import { revalidateSiteSettings } from '@/lib/revalidate';

export async function saveSiteSettings(input: unknown): Promise<ActionResult<null>> {
  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const { supabase } = await requireAdmin();
  const result = await attempt(async () => {
    await updateSiteSettings(supabase, parsed.data);
    return null;
  });
  if (result.ok) revalidateSiteSettings();
  return result;
}
