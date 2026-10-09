'use server';

import { applyAsDealer, createDealerDocumentUpload, recordDealerDocument } from '@cp/api';
import type { ActionResult } from '@cp/types';
import { dealerApplicationSchema, uuidSchema } from '@cp/validators';
import { z } from 'zod';

import { attempt, invalidInput } from '@/lib/action-result';
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/documents';
import { getSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export async function submitDealerApplication(
  input: unknown,
): Promise<ActionResult<{ dealerId: string }>> {
  const parsed = dealerApplicationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const ctx = await getSession();
  if (!ctx) return { ok: false, error: 'Please sign in to apply.' };
  const supabase = await createClient();
  // No refresh(): the client still uploads documents, then shows its own confirmation.
  return attempt(async () => ({ dealerId: await applyAsDealer(supabase, parsed.data) }));
}

const documentSchema = z.object({
  dealerId: uuidSchema,
  fileId: uuidSchema,
  name: z.string().trim().min(1).max(200),
  size: z.number().int().positive().max(MAX_DOCUMENT_BYTES, 'Documents can be up to 20 MB'),
  type: z.enum(DOCUMENT_TYPES, 'Upload a PDF, JPEG or PNG'),
});

/** Signed upload URL for a supporting document (Storage RLS: members of that dealer only). */
export async function requestDocumentUpload(
  input: unknown,
): Promise<ActionResult<{ path: string; signedUrl: string }>> {
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error, parsed.error.issues[0]?.message);
  const supabase = await createClient();
  return attempt(async () => {
    const { path, signedUrl } = await createDealerDocumentUpload(
      supabase,
      parsed.data.dealerId,
      parsed.data,
    );
    return { path, signedUrl };
  });
}

export async function recordDocument(input: unknown): Promise<ActionResult<{ name: string }>> {
  const parsed = z
    .object({
      dealerId: uuidSchema,
      path: z.string().min(1).max(500),
      name: z.string().trim().min(1).max(200),
      size: z.number().int().positive().nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error, 'Invalid document');
  const supabase = await createClient();
  return attempt(async () => {
    const doc = await recordDealerDocument(supabase, parsed.data.dealerId, parsed.data);
    return { name: doc.name };
  });
}
