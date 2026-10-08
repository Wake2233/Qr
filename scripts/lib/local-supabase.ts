/**
 * Service-role client for the LOCAL Supabase stack only.
 * Credentials come from `supabase status`, so these scripts can never touch a hosted project.
 */
import { execFileSync } from 'node:child_process';

import type { Database } from '@cp/types';
import { createClient } from '@supabase/supabase-js';

interface LocalStatus {
  API_URL: string;
  SECRET_KEY?: string;
  SERVICE_ROLE_KEY?: string;
}

export function localAdminClient() {
  const raw = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const status = JSON.parse(raw.slice(raw.indexOf('{'))) as LocalStatus;
  const url = new URL(status.API_URL);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error(`Refusing to seed non-local Supabase at ${status.API_URL}`);
  }
  const key = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!key) throw new Error('Local Supabase secret key not found — is `pnpm db:start` running?');

  return createClient<Database>(status.API_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
