import { beforeAll, describe, expect, it } from 'vitest';

import type { AppSupabaseClient } from './client';

import { getFacets } from './facets';
import { addFavorite, listFavoriteIds, mergeFavorites, removeFavorite } from './favorites';
import { getSiteSettings } from './settings';
import { listSitemapDealers, listSitemapVehicles } from './sitemap';
import { anonClient, hasTestDb, signedInClient } from './test-clients';
import {
  getVehicleBySlug,
  getVehicleDetailsByIds,
  getVehiclesByIds,
  listFeaturedVehicles,
  listPriceDrops,
  listRecentlySold,
  listSimilarVehicles,
  listVehicles,
} from './vehicles';

describe.skipIf(!hasTestDb)('inventory queries (local Supabase + seed)', () => {
  let client: AppSupabaseClient;
  beforeAll(() => {
    client = anonClient();
  });

  it('lists only live listings and agrees with the facet total', async () => {
    const [page, facets] = await Promise.all([listVehicles(client), getFacets(client)]);
    expect(page.total).toBe(facets.total);
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.length).toBeLessThanOrEqual(page.pageSize);
    for (const card of page.items) {
      expect(['active', 'reserved']).toContain(card.status);
      expect(card.dealer_status).toBe('approved');
      expect(card.title).toContain(card.make_name);
      expect(card.cover_url).toMatch(/\/storage\/v1\/object\/public\/vehicle-images\//);
    }
  });

  it('filters, sorts and paginates', async () => {
    const all = await listVehicles(client, { sort: 'price_asc' });
    const prices = all.items.map((c) => c.price_cents ?? 0);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    const cheapest = prices[0] ?? 0;
    const capped = await listVehicles(client, { priceMaxCents: cheapest });
    expect(capped.items.every((c) => (c.price_cents ?? 0) <= cheapest)).toBe(true);

    const make = all.items[0]?.make_slug ?? '';
    const byMake = await listVehicles(client, { make: [make] });
    const facets = await getFacets(client, { make: [make] });
    expect(byMake.items.every((c) => c.make_slug === make)).toBe(true);
    expect(byMake.total).toBe(facets.total);
    expect(facets.make.length).toBeGreaterThan(1); // own filter ignored

    const page2 = await listVehicles(client, { page: 2 }, { pageSize: 5 });
    const page1 = await listVehicles(client, { page: 1 }, { pageSize: 5 });
    expect(page2.page).toBe(2);
    expect(page2.items.map((c) => c.id)).not.toContain(page1.items[0]?.id);
  });

  it('supports full-text search', async () => {
    const all = await listVehicles(client);
    const model = all.items[0]?.model_name ?? '';
    const found = await listVehicles(client, { q: model });
    expect(found.items.some((c) => c.model_name === model)).toBe(true);
  });

  it('loads a VDP with ordered images, features and dealer', async () => {
    const [card] = (await listVehicles(client, { sort: 'newest' }, { pageSize: 1 })).items;
    if (!card) throw new Error('seed has no live vehicles');
    const detail = await getVehicleBySlug(client, card.slug);
    expect(detail?.id).toBe(card.id);
    expect(detail?.title).toBe(card.title);
    expect(detail?.price_cents).toBe(card.price_cents);
    expect(detail?.images.map((i) => i.position)).toEqual(
      [...(detail?.images ?? [])].map((i) => i.position).sort((a, b) => a - b),
    );
    expect(detail?.images[0]?.url).toContain('vehicle-images');
    expect(detail?.dealer?.status).toBe('approved');
    await expect(getVehicleBySlug(client, 'no-such-vehicle-00000000')).resolves.toBeNull();
  });

  it('hides drafts from anon on the VDP', async () => {
    const admin = await signedInClient('admin@test.local');
    const { data } = await admin
      .from('vehicles')
      .select('slug')
      .eq('status', 'draft')
      .limit(1)
      .single();
    await expect(getVehicleBySlug(client, data?.slug ?? '')).resolves.toBeNull();
    await expect(getVehicleBySlug(admin, data?.slug ?? '')).resolves.not.toBeNull();
  });

  it('returns cards by id in the requested order', async () => {
    const { items } = await listVehicles(client, {}, { pageSize: 3 });
    const ids = items.map((c) => c.id).reverse();
    expect((await getVehiclesByIds(client, ids)).map((c) => c.id)).toEqual(ids);
    expect(await getVehiclesByIds(client, [])).toEqual([]);
  });

  it('puts featured vehicles first on home rails', async () => {
    const rail = await listFeaturedVehicles(client, 4);
    expect(rail.length).toBeGreaterThan(0);
    const flags = rail.map((c) => c.is_featured);
    expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));
  });

  it('parses site settings with the business numbers', async () => {
    const settings = await getSiteSettings(client);
    expect(settings.default_whatsapp_e164).toBe('+13473700570');
    expect(settings.apr_by_tier.good).toBe(900);
    expect(settings.business_hours.sun).toBeNull();
  });

  it('round-trips favorites for a signed-in buyer (RLS: own rows only)', async () => {
    const buyer = await signedInClient('buyer@test.local');
    const { data: user } = await buyer.auth.getUser();
    const userId = user.user?.id ?? '';
    const { items } = await listVehicles(client, {}, { pageSize: 2 });
    const [a, b] = items.map((c) => c.id);
    if (!a || !b) throw new Error('need two vehicles');

    await addFavorite(buyer, userId, a);
    await addFavorite(buyer, userId, a); // idempotent
    await mergeFavorites(buyer, userId, [a, b]);
    expect(new Set(await listFavoriteIds(buyer, userId))).toEqual(new Set([a, b]));

    const other = await signedInClient('dealer.owner@test.local');
    expect(await listFavoriteIds(other, userId)).toEqual([]);

    await removeFavorite(buyer, userId, a);
    await removeFavorite(buyer, userId, b);
    expect(await listFavoriteIds(buyer, userId)).toEqual([]);
  });
  it('searches as you type: a partial model name matches, and agrees with the facets', async () => {
    const all = await listVehicles(client);
    const model = all.items[0]?.model_name ?? '';
    const prefix = model.slice(0, Math.max(2, Math.min(3, model.length)));
    const [page, facets] = await Promise.all([
      listVehicles(client, { q: prefix }),
      getFacets(client, { q: prefix }),
    ]);
    expect(page.items.map((c) => c.id)).toContain(all.items[0]?.id);
    expect(page.total).toBe(facets.total);

    const none = await listVehicles(client, { q: '%%%' });
    expect(none.total).toBe(all.total); // punctuation only = no text filter
  });

  it('lists price drops and recently sold rails', async () => {
    const [drops, sold] = await Promise.all([listPriceDrops(client), listRecentlySold(client)]);
    expect(drops.length).toBeGreaterThan(0);
    for (const card of drops) {
      expect(card.previous_price_cents ?? 0).toBeGreaterThan(card.price_cents ?? 0);
      expect(['active', 'reserved']).toContain(card.status);
    }
    expect(sold.length).toBeGreaterThan(0);
    expect(sold.every((c) => c.status === 'sold')).toBe(true);
    const soldAt = sold.map((c) => c.sold_at ?? '');
    expect(soldAt).toEqual([...soldAt].sort().reverse());
  });

  it('suggests similar live vehicles near the price, never the vehicle itself', async () => {
    const { items } = await listVehicles(client);
    const base = items[0];
    expect(base).toBeDefined();
    const priceCents = base?.price_cents ?? 0;
    const similar = await listSimilarVehicles(client, {
      id: base?.id ?? '',
      makeId: base?.make_id ?? 0,
      bodyType: base?.body_type ?? null,
      priceCents,
    });
    for (const card of similar) {
      expect(card.id).not.toBe(base?.id);
      expect(card.body_type === base?.body_type || card.make_id === base?.make_id).toBe(true);
      expect(card.price_cents ?? 0).toBeGreaterThanOrEqual(Math.floor(priceCents * 0.6));
      expect(card.price_cents ?? 0).toBeLessThanOrEqual(Math.ceil(priceCents * 1.4));
    }
    const gaps = similar.map((c) => Math.abs((c.price_cents ?? 0) - priceCents));
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
  });

  it('loads full details for compare in the requested order', async () => {
    const { items } = await listVehicles(client, { sort: 'price_desc' });
    const ids = items.slice(0, 3).map((c) => c.id);
    const details = await getVehicleDetailsByIds(client, [...ids].reverse());
    expect(details.map((d) => d.id)).toEqual([...ids].reverse());
    for (const detail of details) {
      expect(detail.title).toContain(detail.make.name);
      expect(detail.images[0]?.position).toBe(0);
    }
    expect(await getVehicleDetailsByIds(client, [])).toEqual([]);
  });
  it('lists public vehicle and dealer slugs for the sitemap', async () => {
    const [vehicles, dealers, page] = await Promise.all([
      listSitemapVehicles(client),
      listSitemapDealers(client),
      listVehicles(client),
    ]);
    expect(vehicles).toHaveLength(page.total);
    expect(vehicles.every((v) => v.slug.length > 0 && v.updated_at)).toBe(true);
    expect(dealers.length).toBeGreaterThan(0);
    expect(dealers.map((d) => d.slug)).not.toContain('hudson-valley-cars');
  });
});
