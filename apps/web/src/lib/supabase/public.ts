import 'server-only';

import type { Database } from '@cp/types';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

/**
 * Cookie-less anon client for public storefront reads. Safe inside `'use cache'` scopes:
 * results depend only on the arguments, never on who is asking (RLS sees `anon`).
 */
export function createPublicClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
