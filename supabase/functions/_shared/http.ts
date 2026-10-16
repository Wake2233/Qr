/** CORS + JSON helpers shared by Edge Functions (browsers call them through supabase-js). */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Errors use the same "CODE: message" convention as database RPCs (see @cp/core parseDbError). */
export const errorResponse = (status: number, code: string, message: string) =>
  json({ error: `${code}: ${message}` }, status);

/**
 * One readable log line per event (Supabase → Edge Functions → Logs), same shape as the web app:
 * `[decode-vin] refused: FORBIDDEN · status=403`. Never log tokens or personal data.
 */
export function logEvent(
  scope: string,
  message: string,
  fields: Record<string, string | number | boolean | null | undefined> = {},
  level: 'info' | 'warn' | 'error' = 'info',
) {
  const parts = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${value}`);
  console[level]([`[${scope}] ${message}`, ...parts].join(' · '));
}
