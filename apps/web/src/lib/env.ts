// Ships to every page (the browser Supabase client reads it), so it validates without zod.

function requireUrl(name: string, value: string | undefined): string {
  if (!value || !URL.canParse(value)) throw new Error(`${name} must be an absolute URL`);
  return value;
}

function requireKey(name: string, value: string | undefined): string {
  if (!value || value.length < 20) throw new Error(`${name} is missing or too short`);
  return value;
}

/**
 * Public env, validated once. NEXT_PUBLIC_* vars must be referenced literally so Next can inline them.
 * Never put the Supabase secret/service-role key here (see CLAUDE.md rule 4).
 */
export const env = {
  NEXT_PUBLIC_SITE_URL: requireUrl('NEXT_PUBLIC_SITE_URL', process.env.NEXT_PUBLIC_SITE_URL),
  NEXT_PUBLIC_SUPABASE_URL: requireUrl(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: requireKey(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
} as const;
