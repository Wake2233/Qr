/**
 * Dealer onboarding, admin moderation, dealer profile and team management.
 * Status changes only happen through the admin RPCs (column grants block direct updates).
 */
import type { Enums } from '@cp/types';
import type { DealerApplication, DealerModeration, DealerProfile } from '@cp/validators';
import { z } from 'zod';

import type { AppSupabaseClient } from './client';

export const DEALER_DOCS_BUCKET = 'dealer-docs';
export const DEALER_ASSETS_BUCKET = 'dealer-assets';

type DealerStatus = Enums<'dealer_status'>;

/** One entry of `dealer_private.documents`. */
export const dealerDocumentSchema = z.object({
  path: z.string(),
  name: z.string(),
  size: z.number().int().nonnegative().nullable().catch(null),
  uploaded_at: z.string(),
});
export type DealerDocument = z.infer<typeof dealerDocumentSchema>;

const documentsSchema = z.array(dealerDocumentSchema).catch([]);

/** "Sell with us": creates a pending dealer owned by the caller. Returns the dealer id. */
export async function applyAsDealer(
  client: AppSupabaseClient,
  application: DealerApplication,
): Promise<string> {
  const { data, error } = await client.rpc('apply_as_dealer', { payload: { ...application } });
  if (error) throw error;
  return data;
}

/** `{dealer_id}/{file_id}-{safe-name}` inside the private dealer-docs bucket. */
export function dealerDocumentPath(dealerId: string, fileId: string, fileName: string): string {
  const safe = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-80);
  return `${dealerId}/${fileId}-${safe || 'document'}`;
}

/** Uploads one supporting document (license, insurance…) and records it on the dealer. */
export async function uploadDealerDocument(
  client: AppSupabaseClient,
  dealerId: string,
  file: {
    fileId: string;
    name: string;
    size: number | null;
    body: ArrayBuffer | Blob;
    contentType: string;
  },
): Promise<DealerDocument> {
  const path = dealerDocumentPath(dealerId, file.fileId, file.name);
  const upload = await client.storage
    .from(DEALER_DOCS_BUCKET)
    .upload(path, file.body, { contentType: file.contentType, upsert: false });
  if (upload.error) throw upload.error;

  const { data: current, error: readError } = await client
    .from('dealer_private')
    .select('documents')
    .eq('dealer_id', dealerId)
    .single();
  if (readError) throw readError;
  const document: DealerDocument = {
    path,
    name: file.name.slice(0, 200),
    size: file.size,
    uploaded_at: new Date().toISOString(),
  };
  const documents = [...documentsSchema.parse(current.documents), document];
  const { error } = await client
    .from('dealer_private')
    .update({ documents })
    .eq('dealer_id', dealerId);
  if (error) throw error;
  return document;
}

/** Short-lived links for reviewing private dealer documents (members and admins only). */
export async function dealerDocumentUrls(
  client: AppSupabaseClient,
  documents: readonly DealerDocument[],
  expiresInSeconds = 600,
): Promise<(DealerDocument & { url: string | null })[]> {
  if (documents.length === 0) return [];
  const { data, error } = await client.storage.from(DEALER_DOCS_BUCKET).createSignedUrls(
    documents.map((d) => d.path),
    expiresInSeconds,
  );
  if (error) throw error;
  return documents.map((doc, i) => ({ ...doc, url: data[i]?.signedUrl ?? null }));
}

export interface DealerListFilters {
  status?: DealerStatus;
  q?: string;
}

/** Admin dealer queue. Pending applications sort first, oldest first (FIFO review). */
export async function listDealersForAdmin(
  client: AppSupabaseClient,
  { status, q }: DealerListFilters = {},
) {
  let query = client
    .from('dealers')
    .select(
      'id, slug, display_name, legal_name, status, is_house, city, state, email, phone_e164, created_at, approved_at, rejection_reason, vehicles(count)',
    );
  if (status) query = query.eq('status', status);
  const term = (q ?? '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim();
  if (term)
    query = query.or(`display_name.ilike.*${term}*,city.ilike.*${term}*,email.ilike.*${term}*`);
  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw error;

  const rank: Record<DealerStatus, number> = { pending: 0, approved: 1, suspended: 2, rejected: 3 };
  return data
    .map(({ vehicles, ...dealer }) => ({ ...dealer, vehicle_count: vehicles[0]?.count ?? 0 }))
    .sort((a, b) => rank[a.status] - rank[b.status]);
}

export type AdminDealerRow = Awaited<ReturnType<typeof listDealersForAdmin>>[number];

/** Dealer profile + private details + team, for the admin review page and the profile editor. */
export async function getConsoleDealer(client: AppSupabaseClient, dealerId: string) {
  const [dealerResult, privateResult, team] = await Promise.all([
    client.from('dealers').select('*').eq('id', dealerId).maybeSingle(),
    client
      .from('dealer_private')
      .select('license_number, tax_id_last4, documents')
      .eq('dealer_id', dealerId)
      .maybeSingle(),
    getDealerTeam(client, dealerId),
  ]);
  if (dealerResult.error) throw dealerResult.error;
  if (privateResult.error) throw privateResult.error;
  if (!dealerResult.data) return null;
  return {
    ...dealerResult.data,
    private: privateResult.data
      ? { ...privateResult.data, documents: documentsSchema.parse(privateResult.data.documents) }
      : null,
    team,
  };
}

export type ConsoleDealer = NonNullable<Awaited<ReturnType<typeof getConsoleDealer>>>;

export async function moderateDealer(client: AppSupabaseClient, input: DealerModeration) {
  const { error } =
    input.action === 'approve'
      ? await client.rpc('approve_dealer', { p_dealer_id: input.dealer_id })
      : input.action === 'reject'
        ? await client.rpc('reject_dealer', {
            p_dealer_id: input.dealer_id,
            p_reason: input.reason,
          })
        : await client.rpc('suspend_dealer', {
            p_dealer_id: input.dealer_id,
            p_reason: input.reason,
          });
  if (error) throw error;
}

export async function updateDealerProfile(
  client: AppSupabaseClient,
  dealerId: string,
  profile: DealerProfile,
) {
  const { business_hours, ...fields } = profile;
  const { error } = await client
    .from('dealers')
    .update({ ...fields, business_hours })
    .eq('id', dealerId);
  if (error) throw error;
}

/** Uploads a new logo to dealer-assets and points the dealer at it. */
export async function uploadDealerLogo(
  client: AppSupabaseClient,
  dealerId: string,
  { fileId, body, contentType }: { fileId: string; body: ArrayBuffer | Blob; contentType: string },
): Promise<string> {
  const path = `${dealerId}/logo-${fileId}.webp`;
  const upload = await client.storage
    .from(DEALER_ASSETS_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (upload.error) throw upload.error;
  const { error } = await client.from('dealers').update({ logo_path: path }).eq('id', dealerId);
  if (error) throw error;
  return path;
}

export function dealerLogoUrl(client: AppSupabaseClient, path: string | null): string | null {
  return path ? client.storage.from(DEALER_ASSETS_BUCKET).getPublicUrl(path).data.publicUrl : null;
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export async function getDealerTeam(client: AppSupabaseClient, dealerId: string) {
  const { data, error } = await client.rpc('get_dealer_team', { p_dealer_id: dealerId });
  if (error) throw error;
  return data;
}

export type TeamMember = Awaited<ReturnType<typeof getDealerTeam>>[number];

export async function addDealerMember(
  client: AppSupabaseClient,
  input: { dealer_id: string; email: string; role: Enums<'dealer_member_role'> },
): Promise<string> {
  const { data, error } = await client.rpc('add_dealer_member', {
    p_dealer_id: input.dealer_id,
    p_email: input.email,
    p_role: input.role,
  });
  if (error) throw error;
  return data;
}

export async function updateDealerMemberRole(
  client: AppSupabaseClient,
  dealerId: string,
  userId: string,
  role: Enums<'dealer_member_role'>,
) {
  const { data, error } = await client
    .from('dealer_members')
    .update({ role })
    .eq('dealer_id', dealerId)
    .eq('user_id', userId)
    .select('user_id');
  if (error) throw error;
  if (data.length === 0) throw new Error('FORBIDDEN: you cannot change that member');
}

export async function removeDealerMember(
  client: AppSupabaseClient,
  dealerId: string,
  userId: string,
) {
  const { data, error } = await client
    .from('dealer_members')
    .delete()
    .eq('dealer_id', dealerId)
    .eq('user_id', userId)
    .select('user_id');
  if (error) throw error;
  if (data.length === 0) throw new Error('FORBIDDEN: you cannot remove that member');
}
