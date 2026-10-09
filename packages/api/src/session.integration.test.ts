/**
 * Runs against the local Supabase stack (`pnpm db:start && pnpm db:reset && pnpm db:seed:users`).
 * Skipped unless SUPABASE_TEST_URL and SUPABASE_TEST_PUBLISHABLE_KEY are set.
 */
import { describe, expect, it } from 'vitest';

import { getSessionContext } from './session';
import { anonClient, hasTestDb, signedInClient as signedIn } from './test-clients';

describe.skipIf(!hasTestDb)('getSessionContext (local Supabase)', () => {
  it('returns null when signed out', async () => {
    await expect(getSessionContext(anonClient())).resolves.toBeNull();
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
