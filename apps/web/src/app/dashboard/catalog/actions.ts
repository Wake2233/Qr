'use server';

import { createFeature, createMake, createModel, deleteCatalogEntry } from '@cp/api';
import type { ActionResult } from '@cp/types';
import { featureSchema, makeSchema, modelSchema } from '@cp/validators';
import { refresh } from 'next/cache';
import { z } from 'zod';

import { attempt, invalidInput } from '@/lib/action-result';
import { requireAdmin } from '@/lib/console';

const entrySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('make'), values: makeSchema }),
  z.object({ kind: z.literal('model'), values: modelSchema }),
  z.object({ kind: z.literal('feature'), values: featureSchema }),
]);

export async function addCatalogEntry(input: unknown): Promise<ActionResult<null>> {
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error, parsed.error.issues[0]?.message ?? 'Check the fields');
  }
  const { supabase } = await requireAdmin();
  const entry = parsed.data;
  const result = await attempt(async () => {
    if (entry.kind === 'make') await createMake(supabase, entry.values);
    else if (entry.kind === 'model') await createModel(supabase, entry.values);
    else await createFeature(supabase, entry.values);
    return null;
  });
  if (result.ok) refresh();
  return result;
}

export async function removeCatalogEntry(input: unknown): Promise<ActionResult<null>> {
  const parsed = z
    .object({ table: z.enum(['makes', 'models', 'features']), id: z.number().int().positive() })
    .safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error, 'Invalid entry');
  const { supabase } = await requireAdmin();
  const result = await attempt(async () => {
    await deleteCatalogEntry(supabase, parsed.data.table, parsed.data.id);
    return null;
  });
  if (result.ok) refresh();
  return result;
}
