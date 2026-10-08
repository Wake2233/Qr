import type { Database } from '@cp/types';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Every @cp/api function takes the caller's client (web server/browser or mobile). */
export type AppSupabaseClient = SupabaseClient<Database>;
