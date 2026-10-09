import { assertEquals } from 'jsr:@std/assert@1';

import { BMW_X5_2021, UNDECODABLE } from './fixtures.ts';
import { createHandler, type DecodeVinDeps } from './handler.ts';
import type { VpicResult } from './map.ts';

const VIN = '5UXCR6C05M9F12345';

function fakeDeps(overrides: Partial<DecodeVinDeps> = {}) {
  const cache = new Map<string, VpicResult>();
  const calls = { vpic: 0 };
  const deps: DecodeVinDeps = {
    authorize: (header) =>
      Promise.resolve(
        header === 'Bearer dealer' ? 'allowed' : header ? 'forbidden' : 'unauthenticated',
      ),
    readCache: (vin) => Promise.resolve(cache.get(vin) ?? null),
    writeCache: (vin, payload) => {
      cache.set(vin, payload);
      return Promise.resolve();
    },
    fetchVpic: () => {
      calls.vpic += 1;
      return Promise.resolve(BMW_X5_2021);
    },
    matchCatalog: (make, model) =>
      Promise.resolve(
        make === 'bmw'
          ? { make_id: 3, model_id: model === 'x5' ? 31 : null }
          : { make_id: null, model_id: null },
      ),
    ...overrides,
  };
  return { deps, cache, calls };
}

const post = (body: unknown, auth: string | null = 'Bearer dealer') =>
  new Request('http://localhost/decode-vin', {
    method: 'POST',
    headers: auth ? { Authorization: auth } : {},
    body: JSON.stringify(body),
  });

Deno.test('decodes, matches the catalog and caches the result', async () => {
  const { deps, cache, calls } = fakeDeps();
  const handler = createHandler(deps);

  const first = await handler(post({ vin: ` ${VIN.toLowerCase()} ` }));
  assertEquals(first.status, 200);
  const body = await first.json();
  assertEquals(body.vin, VIN);
  assertEquals(body.cached, false);
  assertEquals([body.make_id, body.model_id, body.year, body.body_type], [3, 31, 2021, 'suv']);
  assertEquals(cache.has(VIN), true);

  const second = await (await handler(post({ vin: VIN }))).json();
  assertEquals(second.cached, true);
  assertEquals(calls.vpic, 1);
});

Deno.test('rejects anonymous and non-dealer callers before calling NHTSA', async () => {
  const { deps, calls } = fakeDeps();
  const handler = createHandler(deps);
  assertEquals((await handler(post({ vin: VIN }, null))).status, 401);
  const forbidden = await handler(post({ vin: VIN }, 'Bearer buyer'));
  assertEquals(forbidden.status, 403);
  assertEquals((await forbidden.json()).error.startsWith('FORBIDDEN:'), true);
  assertEquals(calls.vpic, 0);
});

Deno.test('validates the VIN', async () => {
  const handler = createHandler(fakeDeps().deps);
  for (const vin of ['', 'SHORT', '5UXCR6C05M9F1234O', 42]) {
    const res = await handler(post({ vin }));
    assertEquals(res.status, 400, String(vin));
    assertEquals((await res.json()).error.startsWith('INVALID_VIN:'), true);
  }
});

Deno.test('reports undecodable VINs without caching them', async () => {
  const { deps, cache } = fakeDeps({ fetchVpic: () => Promise.resolve(UNDECODABLE) });
  const res = await createHandler(deps)(post({ vin: VIN }));
  assertEquals(res.status, 422);
  assertEquals(cache.size, 0);
});

Deno.test('returns 502 when NHTSA is down', async () => {
  const { deps } = fakeDeps({ fetchVpic: () => Promise.reject(new Error('timeout')) });
  assertEquals((await createHandler(deps)(post({ vin: VIN }))).status, 502);
});

Deno.test('warns when the make or model is missing from the catalog', async () => {
  const { deps } = fakeDeps({
    matchCatalog: () => Promise.resolve({ make_id: 3, model_id: null }),
  });
  const body = await (await createHandler(deps)(post({ vin: VIN }))).json();
  assertEquals(body.warnings, ['X5 is not in the catalog yet']);

  const { deps: noMake } = fakeDeps({
    matchCatalog: () => Promise.resolve({ make_id: null, model_id: null }),
  });
  const body2 = await (await createHandler(noMake)(post({ vin: VIN }))).json();
  assertEquals(body2.warnings, ['BMW is not in the catalog yet']);
});

Deno.test('answers CORS preflight and rejects other methods', async () => {
  const handler = createHandler(fakeDeps().deps);
  const preflight = await handler(new Request('http://localhost', { method: 'OPTIONS' }));
  assertEquals(preflight.headers.get('Access-Control-Allow-Origin'), '*');
  await preflight.body?.cancel();
  const get = await handler(new Request('http://localhost', { method: 'GET' }));
  assertEquals(get.status, 405);
  await get.body?.cancel();
});
