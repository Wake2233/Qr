'use server';

import {
  addDealerMember,
  createDealerLogoUpload,
  removeDealerMember,
  setDealerLogo,
  updateDealerMemberRole,
  updateDealerProfile,
} from '@cp/api';
import { Constants, type ActionResult } from '@cp/types';
import { dealerProfileSchema, teamMemberInviteSchema, uuidSchema } from '@cp/validators';
import { refresh } from 'next/cache';
import { z } from 'zod';

import { attempt, invalidInput } from '@/lib/action-result';
import { requireConsole } from '@/lib/console';
import { revalidateInventory } from '@/lib/revalidate';

/** Owners/managers of the dealer, or admins (RLS enforces it again). */
async function requireManager(dealerId: string) {
  const console = await requireConsole();
  if (!console.isAdmin && !console.managedDealerIds.includes(dealerId)) return null;
  return console;
}

export async function saveDealerProfile(
  dealerId: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const id = uuidSchema.safeParse(dealerId);
  const parsed = dealerProfileSchema.safeParse(input);
  if (!id.success) return { ok: false, error: 'Invalid dealer' };
  if (!parsed.success) return invalidInput(parsed.error);
  const console = await requireManager(id.data);
  if (!console) return { ok: false, error: 'Only owners and managers can edit the profile.' };
  const result = await attempt(async () => {
    await updateDealerProfile(console.supabase, id.data, parsed.data);
    return null;
  });
  // Dealer name, phone and WhatsApp appear on every listing.
  if (result.ok) revalidateInventory();
  return result;
}

export async function requestLogoUpload(
  dealerId: string,
  extension: unknown,
): Promise<ActionResult<{ path: string; signedUrl: string }>> {
  const parsed = z
    .object({ dealerId: uuidSchema, extension: z.enum(['webp', 'jpg', 'png']) })
    .safeParse({ dealerId, extension });
  if (!parsed.success) return invalidInput(parsed.error, 'Invalid logo');
  const console = await requireManager(parsed.data.dealerId);
  if (!console) return { ok: false, error: 'Only owners and managers can change the logo.' };
  return attempt(() =>
    createDealerLogoUpload(
      console.supabase,
      parsed.data.dealerId,
      crypto.randomUUID(),
      parsed.data.extension,
    ),
  );
}

export async function saveDealerLogo(dealerId: string, path: unknown): Promise<ActionResult<null>> {
  const parsed = z
    .object({ dealerId: uuidSchema, path: z.string().max(300).nullable() })
    .safeParse({ dealerId, path });
  if (!parsed.success) return invalidInput(parsed.error, 'Invalid logo');
  const console = await requireManager(parsed.data.dealerId);
  if (!console) return { ok: false, error: 'Only owners and managers can change the logo.' };
  const result = await attempt(async () => {
    await setDealerLogo(console.supabase, parsed.data.dealerId, parsed.data.path);
    return null;
  });
  if (result.ok) revalidateInventory();
  return result;
}

export async function addTeamMember(input: unknown): Promise<ActionResult<null>> {
  const parsed = teamMemberInviteSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const console = await requireManager(parsed.data.dealer_id);
  if (!console) return { ok: false, error: 'Only owners and managers can add team members.' };
  const result = await attempt(async () => {
    await addDealerMember(console.supabase, parsed.data);
    return null;
  });
  if (result.ok) refresh();
  return result;
}

const memberSchema = z.object({ dealerId: uuidSchema, userId: uuidSchema });

export async function changeMemberRole(input: unknown): Promise<ActionResult<null>> {
  const parsed = memberSchema
    .extend({ role: z.enum(Constants.public.Enums.dealer_member_role) })
    .safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error, 'Invalid role');
  const console = await requireManager(parsed.data.dealerId);
  if (!console) return { ok: false, error: 'Only owners and managers can change roles.' };
  const result = await attempt(async () => {
    await updateDealerMemberRole(
      console.supabase,
      parsed.data.dealerId,
      parsed.data.userId,
      parsed.data.role,
    );
    return null;
  });
  if (result.ok) refresh();
  return result;
}

export async function removeTeamMember(input: unknown): Promise<ActionResult<null>> {
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error, 'Invalid member');
  const console = await requireManager(parsed.data.dealerId);
  if (!console) return { ok: false, error: 'Only owners and managers can remove members.' };
  if (parsed.data.userId === console.ctx.userId) {
    return { ok: false, error: 'You cannot remove yourself. Ask another owner.' };
  }
  const result = await attempt(async () => {
    await removeDealerMember(console.supabase, parsed.data.dealerId, parsed.data.userId);
    return null;
  });
  if (result.ok) refresh();
  return result;
}
