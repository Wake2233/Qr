/**
 * Clients for *.integration.test.ts (local Supabase only). Skipped unless
 * SUPABASE_TEST_URL and SUPABASE_TEST_PUBLISHABLE_KEY are set — `pnpm test:integration` sets them.
 */
import type { Database } from '@cp/types';
import { createClient } from '@supabase/supabase-js';

// @cp/api stays free of Node types; vitest provides process.env at runtime.
declare const process: { env: Record<string, string | undefined> };

export const testUrl = process.env.SUPABASE_TEST_URL;
export const testKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
export const hasTestDb = Boolean(testUrl && testKey);

/** Local-only password from scripts/seed-users.ts. */
const LOCAL_TEST_PASSWORD = 'LocalDev-2026!';

export const anonClient = () =>
  createClient<Database>(testUrl ?? '', testKey ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export async function signedInClient(email: string) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password: LOCAL_TEST_PASSWORD });
  if (error)
    throw new Error(`Sign-in failed for ${email} (run pnpm db:seed:users): ${error.message}`);
  return client;
}
