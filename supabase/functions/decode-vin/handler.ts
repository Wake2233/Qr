/**
 * decode-vin: POST { vin } → decoded specs + matching catalog ids.
 * Only dealer members and admins may call it. Results are cached forever in `vin_decodes`
 * (specs for a VIN never change), so NHTSA is hit at most once per VIN.
 */
import { corsHeaders, errorResponse, json } from '../_shared/http.ts';
import { isUndecodable, mapVpicResult, slugify, VIN_PATTERN, type VpicResult } from './map.ts';

export interface DecodeVinDeps {
  /** Resolves the caller from the Authorization header; null when signed out/invalid. */
  authorize(authHeader: string | null): Promise<'allowed' | 'forbidden' | 'unauthenticated'>;
  readCache(vin: string): Promise<VpicResult | null>;
  writeCache(vin: string, payload: VpicResult): Promise<void>;
  fetchVpic(vin: string): Promise<VpicResult | null>;
  /** Catalog ids for a make/model slug pair (model may be null when unknown). */
  matchCatalog(
    makeSlug: string,
    modelSlug: string | null,
  ): Promise<{ make_id: number | null; model_id: number | null }>;
}

export function createHandler(deps: DecodeVinDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return errorResponse(405, 'METHOD_NOT_ALLOWED', 'use POST');

    const access = await deps.authorize(req.headers.get('Authorization'));
    if (access === 'unauthenticated') {
      return errorResponse(401, 'NOT_AUTHENTICATED', 'sign in to decode VINs');
    }
    if (access === 'forbidden') {
      return errorResponse(403, 'FORBIDDEN', 'only dealers and admins can decode VINs');
    }

    const body: unknown = await req.json().catch(() => null);
    const raw =
      body && typeof body === 'object' && 'vin' in body && typeof body.vin === 'string'
        ? body.vin
        : '';
    const vin = raw.trim().toUpperCase();
    if (!VIN_PATTERN.test(vin)) {
      return errorResponse(400, 'INVALID_VIN', 'a VIN is 17 letters and digits (no I, O or Q)');
    }

    let payload = await deps.readCache(vin);
    const cached = payload !== null;
    if (!payload) {
      try {
        payload = await deps.fetchVpic(vin);
      } catch {
        payload = null;
      }
      if (!payload) {
        return errorResponse(502, 'DECODER_UNAVAILABLE', 'the VIN decoder is not responding');
      }
      if (isUndecodable(payload)) {
        return errorResponse(422, 'UNDECODABLE_VIN', 'that VIN could not be decoded');
      }
      await deps.writeCache(vin, payload);
    }

    const decoded = mapVpicResult(payload);
    const ids = decoded.make
      ? await deps.matchCatalog(
          slugify(decoded.make),
          decoded.model ? slugify(decoded.model) : null,
        )
      : { make_id: null, model_id: null };
    const warnings = [...decoded.warnings];
    if (decoded.make && !ids.make_id) warnings.push(`${decoded.make} is not in the catalog yet`);
    else if (decoded.model && !ids.model_id) {
      warnings.push(`${decoded.model} is not in the catalog yet`);
    }

    return json({ vin, cached, ...decoded, ...ids, warnings });
  };
}
