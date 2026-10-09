import { createClient } from 'npm:@supabase/supabase-js@2';

import { createHandler } from './handler.ts';
import type { VpicResult } from './map.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const secretKey =
  Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Service client: cache writes only (vin_decodes is not writable by users).
const admin = createClient(url, secretKey, { auth: { persistSession: false } });

const VPIC = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended';

Deno.serve(
  createHandler({
    async authorize(authHeader) {
      if (!authHeader?.startsWith('Bearer ')) return 'unauthenticated';
      // Caller-scoped client: RLS decides which rows they can see.
      const caller = createClient(url, publicKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      });
      const { data, error } = await caller.auth.getUser(authHeader.slice('Bearer '.length));
      if (error || !data.user) return 'unauthenticated';
      const [profile, memberships] = await Promise.all([
        caller.from('profiles').select('role').eq('id', data.user.id).single(),
        caller.from('dealer_members').select('dealer_id').eq('user_id', data.user.id).limit(1),
      ]);
      return profile.data?.role === 'admin' || (memberships.data?.length ?? 0) > 0
        ? 'allowed'
        : 'forbidden';
    },
    async readCache(vin) {
      const { data } = await admin
        .from('vin_decodes')
        .select('payload')
        .eq('vin', vin)
        .maybeSingle();
      return (data?.payload as VpicResult | undefined) ?? null;
    },
    async writeCache(vin, payload) {
      await admin
        .from('vin_decodes')
        .upsert({ vin, payload, decoded_at: new Date().toISOString() });
    },
    async fetchVpic(vin) {
      const response = await fetch(`${VPIC}/${vin}?format=json`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { Results?: VpicResult[] };
      return body.Results?.[0] ?? null;
    },
    async matchCatalog(makeSlug, modelSlug) {
      const { data: make } = await admin
        .from('makes')
        .select('id')
        .eq('slug', makeSlug)
        .maybeSingle();
      if (!make) return { make_id: null, model_id: null };
      if (!modelSlug) return { make_id: make.id, model_id: null };
      const { data: model } = await admin
        .from('models')
        .select('id')
        .eq('make_id', make.id)
        .eq('slug', modelSlug)
        .maybeSingle();
      return { make_id: make.id, model_id: model?.id ?? null };
    },
  }),
);
