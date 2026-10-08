/**
 * Runs against the local Supabase stack (`pnpm db:start && pnpm db:reset && pnpm db:seed:users`).
 * Skipped unless SUPABASE_TEST_URL and SUPABASE_TEST_PUBLISHABLE_KEY are set.
 */
import type { Database } from '@cp/types';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { getSessionContext } from './session';

// @cp/api stays free of Node types; vitest provides process.env at runtime.
declare const process: { env: Record<string, string | undefined> };

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const password = 'LocalDev-2026!';

const signedIn = async (email: string) => {
  const client = createClient<Database>(url ?? '', key ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
};

describe.skipIf(!url || !key)('getSessionContext (local Supabase)', () => {
  it('returns null when signed out', async () => {
    const client = createClient<Database>(url ?? '', key ?? '', {
      auth: { persistSession: false },
    });
    await expect(getSessionContext(client)).resolves.toBeNull();
  });

  it('gives admins console access with their house membership', async () => {
    const ctx = await getSessionContext(await signedIn('admin@test.local'));
    expect(ctx?.profile.role).toBe('admin');
    expect(ctx?.canAccessConsole).toBe(true);
    expect(ctx?.memberships.map((m) => m.dealer.is_house)).toContain(true);
  });

  it('gives pending dealer owners console access', async () => {
    const ctx = await getSessionContext(await signedIn('dealer2.owner@test.local'));
    expect(ctx?.profile.role).toBe('buyer');
    expect(ctx?.memberships[0]?.dealer.status).toBe('pending');
    expect(ctx?.canAccessConsole).toBe(true);
  });

  it('denies plain buyers', async () => {
    const ctx = await getSessionContext(await signedIn('buyer@test.local'));
    expect(ctx?.canAccessConsole).toBe(false);
    expect(ctx?.memberships).toHaveLength(0);
  });
});
