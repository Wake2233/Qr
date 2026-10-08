import { canAccessConsole, type AppRole } from '@cp/core';
import type { Enums, Tables } from '@cp/types';

import type { AppSupabaseClient } from './client';

export interface DealerMembership {
  dealerId: string;
  role: Enums<'dealer_member_role'>;
  dealer: Pick<Tables<'dealers'>, 'display_name' | 'slug' | 'status' | 'is_house'>;
}

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: Pick<Tables<'profiles'>, 'full_name' | 'role'>;
  memberships: DealerMembership[];
  canAccessConsole: boolean;
}

/**
 * Loads the signed-in user's profile and dealer memberships (RLS-scoped to the caller).
 * Returns null when signed out. Identity comes from `getUser()`, which validates the JWT
 * with the Auth server, so it is safe for server-side gating.
 */
export async function getSessionContext(client: AppSupabaseClient): Promise<SessionContext | null> {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return null;
  const user = userData.user;

  const [profileResult, membershipResult] = await Promise.all([
    client.from('profiles').select('full_name, role').eq('id', user.id).single(),
    client
      .from('dealer_members')
      .select('dealer_id, role, dealers(display_name, slug, status, is_house)')
      .eq('user_id', user.id),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (membershipResult.error) throw membershipResult.error;

  const memberships: DealerMembership[] = membershipResult.data.flatMap((row) =>
    row.dealers ? [{ dealerId: row.dealer_id, role: row.role, dealer: row.dealers }] : [],
  );
  const role: AppRole = profileResult.data.role;

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profileResult.data,
    memberships,
    canAccessConsole: canAccessConsole({ role, dealerMemberships: memberships.length }),
  };
}
