import { parseDbError } from '@cp/core';
import { vehicleUpsertSchema } from '@cp/validators';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppSupabaseClient } from './client';

import { listCatalog, listUsers } from './console-admin';
import { getConsoleDealer, getDealerTeam, listDealersForAdmin } from './console-dealers';
import {
  addVehicleImages,
  createPhotoUpload,
  createVehicle,
  deleteVehicle,
  deleteVehicleImage,
  getConsoleVehicle,
  listConsoleVehicles,
  setVehicleStatus,
  updateVehicle,
  updateVehiclePrice,
  uploadPhoto,
} from './console-vehicles';
import { anonClient, hasTestDb, signedInClient } from './test-clients';
import { getVehicleBySlug } from './vehicles';

// @cp/api has no DOM/Node lib types; these globals exist in the vitest (Node 24) runtime.
declare const atob: (data: string) => string;
declare const crypto: { randomUUID(): string };
declare const Blob: { new (parts: ArrayBuffer[]): Blob };

// 1×1 transparent PNG; the bucket checks the declared content type, not the bytes.
const PIXEL = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  ),
  (c) => c.charCodeAt(0),
).buffer;

const fileId = () => crypto.randomUUID();

describe.skipIf(!hasTestDb)('management console (local Supabase + seed)', () => {
  let owner: AppSupabaseClient;
  let otherOwner: AppSupabaseClient;
  let admin: AppSupabaseClient;
  let ownerId: string;
  let dealerId: string;
  let vehicleId: string | undefined;

  beforeAll(async () => {
    [owner, otherOwner, admin] = await Promise.all([
      signedInClient('dealer.owner@test.local'),
      signedInClient('dealer2.owner@test.local'),
      signedInClient('admin@test.local'),
    ]);
    const { data } = await owner.auth.getUser();
    ownerId = data.user?.id ?? '';
    const { data: membership } = await owner
      .from('dealer_members')
      .select('dealer_id')
      .eq('user_id', ownerId)
      .single();
    dealerId = membership?.dealer_id ?? '';
  });

  afterAll(async () => {
    if (vehicleId) await deleteVehicle(admin, vehicleId);
  });

  it('lists only the dealer’s own inventory, including drafts', async () => {
    const page = await listConsoleVehicles(owner, { kind: 'dealers', dealerIds: [dealerId] });
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.every((v) => v.dealer_id === dealerId)).toBe(true);

    const drafts = await listConsoleVehicles(
      owner,
      { kind: 'dealers', dealerIds: [dealerId] },
      { status: 'draft' },
    );
    expect(drafts.items.every((v) => v.status === 'draft')).toBe(true);
  });

  it('searches by stock number and by title words', async () => {
    const page = await listConsoleVehicles(owner, { kind: 'dealers', dealerIds: [dealerId] });
    const sample = page.items.find((v) => v.stock_number);
    expect(sample).toBeDefined();
    const byStock = await listConsoleVehicles(
      owner,
      { kind: 'dealers', dealerIds: [dealerId] },
      { q: sample?.stock_number ?? '' },
    );
    expect(byStock.items.map((v) => v.id)).toContain(sample?.id);

    const byWords = await listConsoleVehicles(
      owner,
      { kind: 'dealers', dealerIds: [dealerId] },
      { q: `${sample?.make_name ?? ''} ${sample?.model_name ?? ''}` },
    );
    expect(byWords.items.map((v) => v.id)).toContain(sample?.id);
  });

  it('creates a draft, uploads a photo, publishes, and buyers see it', async () => {
    const catalog = await listCatalog(owner);
    const model = catalog.models[0];
    expect(model).toBeDefined();
    const input = vehicleUpsertSchema.parse({
      dealer_id: dealerId,
      make_id: model?.make_id,
      model_id: model?.id,
      year: 2023,
      trim: 'Integration',
      mileage: 1234,
      price_cents: 3_199_000,
      body_type: 'sedan',
      fuel_type: 'gasoline',
      drivetrain: 'fwd',
      transmission: 'automatic',
      exterior_color: 'Silver',
      stock_number: `IT-${Date.now().toString(36)}`,
      feature_ids: catalog.features.slice(0, 2).map((f) => f.id),
    });
    const created = await createVehicle(owner, input, ownerId);
    vehicleId = created.id;

    // The publish gate rejects a listing without photos.
    await expect(setVehicleStatus(owner, created.id, 'active')).rejects.toSatisfy(
      (error) => parseDbError(error).code === 'MISSING_IMAGES',
    );

    const target = await createPhotoUpload(owner, {
      dealerId,
      vehicleId: created.id,
      fileId: fileId(),
    });
    await uploadPhoto(owner, target, PIXEL, 'image/webp');
    // Regression: an untyped Blob takes the declared content type (not octet-stream).
    const blobTarget = await createPhotoUpload(owner, {
      dealerId,
      vehicleId: created.id,
      fileId: fileId(),
    });
    await uploadPhoto(owner, blobTarget, new Blob([PIXEL]), 'image/webp');
    const [image] = await addVehicleImages(owner, created.id, [
      { storage_path: target.path, width: 1, height: 1 },
    ]);
    expect(image?.position).toBe(0);

    expect(await setVehicleStatus(owner, created.id, 'active')).toBe('active');
    const detail = await getConsoleVehicle(owner, created.id);
    expect(detail?.feature_ids).toHaveLength(2);
    expect(detail?.images).toHaveLength(1);

    const publicView = await getVehicleBySlug(anonClient(), detail?.slug ?? '');
    expect(publicView?.price_cents).toBe(3_199_000);

    // A live listing keeps its last photo.
    await expect(
      deleteVehicleImage(owner, image ?? { id: '', storage_path: '' }),
    ).rejects.toSatisfy((error) => parseDbError(error).code === 'MISSING_IMAGES');

    await updateVehiclePrice(owner, created.id, 2_999_000);
    await updateVehicle(owner, created.id, { ...input, feature_ids: [] });
    const updated = await getConsoleVehicle(owner, created.id);
    expect(updated?.price_cents).toBe(3_199_000); // updateVehicle saved the form's price again
    expect(updated?.feature_ids).toEqual([]);
  });

  it("blocks other dealers from editing or uploading to this dealer's listing", async () => {
    expect(vehicleId).toBeDefined();
    const id = vehicleId ?? '';
    await expect(updateVehiclePrice(otherOwner, id, 100)).rejects.toSatisfy(
      (error) => parseDbError(error).code === 'NOT_FOUND',
    );
    await expect(
      createPhotoUpload(otherOwner, { dealerId, vehicleId: id, fileId: fileId() }),
    ).rejects.toBeTruthy();
    expect(await getConsoleVehicle(otherOwner, id)).toMatchObject({ status: 'active' }); // public
    const page = await listConsoleVehicles(otherOwner, { kind: 'dealers', dealerIds: [dealerId] });
    expect(page.items.every((v) => v.status === 'active' || v.status === 'reserved')).toBe(true);
  });

  it('loads the dealer profile with private details and team', async () => {
    const dealer = await getConsoleDealer(owner, dealerId);
    expect(dealer?.private).not.toBeNull();
    expect(dealer?.team.some((m) => m.email === 'dealer.owner@test.local')).toBe(true);
    await expect(getDealerTeam(otherOwner, dealerId)).rejects.toSatisfy(
      (error) => parseDbError(error).code === 'FORBIDDEN',
    );
  });

  it('gives admins the dealer queue (pending first) and the user directory', async () => {
    const dealers = await listDealersForAdmin(admin);
    expect(dealers[0]?.status).toBe('pending');
    expect(dealers.some((d) => d.vehicle_count > 0)).toBe(true);

    const users = await listUsers(admin, { search: 'test.local' });
    expect(users.total).toBeGreaterThanOrEqual(5);
    expect(users.items[0]?.role).toBe('admin');
    await expect(listUsers(owner)).rejects.toSatisfy(
      (error) => parseDbError(error).code === 'FORBIDDEN',
    );
  });
});
