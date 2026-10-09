/**
 * Creates local test users and dealer memberships. Idempotent; run after `pnpm db:reset`.
 *
 * All accounts share the local-only password below (never used outside the local stack).
 * Sign in on web/mobile with an email code (emails arrive in Mailpit: http://127.0.0.1:54324),
 * or with the password via the Supabase API in automated tests.
 */
import type { Enums } from '@cp/types';

import { localAdminClient } from './lib/local-supabase';

export const LOCAL_TEST_PASSWORD = 'LocalDev-2026!';

const HOUSE = '00000000-0000-4000-8000-000000000001';
const GARDEN_STATE = '00000000-0000-4000-8000-000000000002';
const HUDSON_VALLEY = '00000000-0000-4000-8000-000000000003';

interface SeedUser {
  email: string;
  fullName: string;
  role: Enums<'app_role'>;
  memberships: { dealerId: string; role: Enums<'dealer_member_role'> }[];
}

const users: SeedUser[] = [
  {
    email: 'admin@test.local',
    fullName: 'Avery Admin',
    role: 'admin',
    memberships: [{ dealerId: HOUSE, role: 'owner' }],
  },
  {
    email: 'dealer.owner@test.local',
    fullName: 'Olivia Owner',
    role: 'dealer',
    memberships: [{ dealerId: GARDEN_STATE, role: 'owner' }],
  },
  {
    email: 'dealer.staff@test.local',
    fullName: 'Sam Staff',
    role: 'dealer',
    memberships: [{ dealerId: GARDEN_STATE, role: 'staff' }],
  },
  {
    email: 'dealer2.owner@test.local',
    fullName: 'Parker Pending',
    role: 'buyer',
    memberships: [{ dealerId: HUDSON_VALLEY, role: 'owner' }],
  },
  { email: 'buyer@test.local', fullName: 'Blake Buyer', role: 'buyer', memberships: [] },
];

async function main() {
  const supabase = localAdminClient();

  const { data: existing, error: listError } = await supabase.auth.admin.listUsers({
    perPage: 200,
  });
  if (listError) throw listError;

  for (const user of users) {
    let id = existing.users.find((u) => u.email === user.email)?.id;
    if (!id) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: LOCAL_TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: user.fullName },
      });
      if (error) throw error;
      id = data.user.id;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: user.role, full_name: user.fullName })
      .eq('id', id);
    if (profileError) throw profileError;

    if (user.memberships.length > 0) {
      const userId = id;
      const { error: memberError } = await supabase.from('dealer_members').upsert(
        user.memberships.map((m) => ({ dealer_id: m.dealerId, user_id: userId, role: m.role })),
        { onConflict: 'dealer_id,user_id' },
      );
      if (memberError) throw memberError;
    }
    console.log(`✓ ${user.email.padEnd(26)} ${user.role}`);
  }
  console.log(`\nLocal-only password for all accounts: ${LOCAL_TEST_PASSWORD}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
