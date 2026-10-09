'use server';

import {
  addVehicleImages,
  bulkUpdateVehicles,
  createPhotoUpload,
  createVehicle,
  decodeVin,
  deleteVehicle,
  deleteVehicleImage,
  reorderVehicleImages,
  setVehicleStatus,
  updateVehicle,
  updateVehiclePrice,
  type PhotoUploadTarget,
  type UploadedPhoto,
  type VinDecodeResult,
} from '@cp/api';
import { MAX_VEHICLE_IMAGES } from '@cp/core';
import { Constants, type ActionResult, type Enums } from '@cp/types';
import { priceCentsSchema, uuidSchema, vehicleUpsertSchema, vinSchema } from '@cp/validators';
import { z } from 'zod';

import { attempt, dbFailure, invalidInput } from '@/lib/action-result';
import { requireConsole } from '@/lib/console';
import { revalidateInventory } from '@/lib/revalidate';

type ListingStatus = Enums<'listing_status'>;
const statusSchema = z.enum(Constants.public.Enums.listing_status);

/** Create or update a listing. `is_featured` is stripped for non-admins (the DB also refuses it). */
export async function saveVehicle(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string; status: ListingStatus | 'draft' }>> {
  const parsed = vehicleUpsertSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const { ctx, supabase, isAdmin } = await requireConsole();
  const values = isAdmin ? parsed.data : { ...parsed.data, is_featured: undefined };

  const result = await attempt(async () => {
    if (id) {
      const saved = await updateVehicle(supabase, uuidSchema.parse(id), values);
      return { id: saved.id, status: saved.status };
    }
    const created = await createVehicle(supabase, values, ctx.userId);
    return { id: created.id, status: 'draft' as const };
  });
  if (result.ok) revalidateInventory(result.data.id);
  return result;
}

/** Status change through the publish gate. Returns the resulting status (may be pending_review). */
export async function changeVehicleStatus(
  id: string,
  status: unknown,
): Promise<ActionResult<{ status: ListingStatus }>> {
  const parsedId = uuidSchema.safeParse(id);
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) return { ok: false, error: 'Invalid request' };
  const { supabase } = await requireConsole();
  const result = await attempt(async () => ({
    status: await setVehicleStatus(supabase, parsedId.data, parsedStatus.data),
  }));
  if (result.ok) revalidateInventory(parsedId.data);
  return result;
}

/** Save the form, then publish — one round trip for the editor's "Publish" button. */
export async function saveAndPublishVehicle(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string; status: ListingStatus }>> {
  const saved = await saveVehicle(id, input);
  if (!saved.ok) return saved;
  const published = await changeVehicleStatus(id, 'active');
  return published.ok ? { ok: true, data: { id, status: published.data.status } } : published;
}

export async function changeVehiclePrice(
  id: string,
  priceCents: unknown,
): Promise<ActionResult<{ priceCents: number }>> {
  const parsed = z.object({ id: uuidSchema, priceCents: priceCentsSchema }).safeParse({
    id,
    priceCents,
  });
  if (!parsed.success) {
    return invalidInput(parsed.error, parsed.error.issues[0]?.message ?? 'Enter a valid price');
  }
  const { supabase } = await requireConsole();
  const result = await attempt(async () => {
    await updateVehiclePrice(supabase, parsed.data.id, parsed.data.priceCents);
    return { priceCents: parsed.data.priceCents };
  });
  if (result.ok) revalidateInventory(parsed.data.id);
  return result;
}

const bulkSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(200),
  action: z.enum(['archive', 'feature', 'unfeature']),
});

/** Admin bulk actions from the inventory table. */
export async function bulkVehicleAction(input: unknown): Promise<ActionResult<{ count: number }>> {
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error, 'Select at least one listing');
  const { supabase, isAdmin } = await requireConsole();
  if (!isAdmin) return { ok: false, error: 'Only admins can run bulk actions.' };
  const { ids, action } = parsed.data;
  const patch =
    action === 'archive'
      ? ({ status: 'archived' } as const)
      : { is_featured: action === 'feature' };
  const result = await attempt(async () => ({
    count: await bulkUpdateVehicles(supabase, ids, patch),
  }));
  if (result.ok) revalidateInventory(...ids);
  return result;
}

export async function removeVehicle(id: string): Promise<ActionResult<null>> {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'Invalid request' };
  const { supabase, isAdmin } = await requireConsole();
  if (!isAdmin) return { ok: false, error: 'Dealers archive listings instead of deleting them.' };
  const result = await attempt(async () => {
    await deleteVehicle(supabase, parsed.data);
    return null;
  });
  if (result.ok) revalidateInventory(parsed.data);
  return result;
}

// ---------------------------------------------------------------------------
// Photos: the browser PUTs bytes to signed Storage URLs; rows are written here.
// ---------------------------------------------------------------------------

const uploadRequestSchema = z.object({
  dealerId: uuidSchema,
  vehicleId: uuidSchema,
  files: z
    .array(z.object({ fileId: uuidSchema, extension: z.enum(['webp', 'jpg']) }))
    .min(1)
    .max(MAX_VEHICLE_IMAGES),
});

/** Signed upload URLs for a batch of photos (Storage RLS is checked per path). */
export async function requestPhotoUploads(
  input: unknown,
): Promise<ActionResult<PhotoUploadTarget[]>> {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error, 'Invalid upload request');
  const { supabase } = await requireConsole();
  const { dealerId, vehicleId, files } = parsed.data;
  return attempt(() =>
    Promise.all(files.map((file) => createPhotoUpload(supabase, { dealerId, vehicleId, ...file }))),
  );
}

const photoSchema = z.object({
  storage_path: z.string().min(1).max(500),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  blurhash: z.string().max(100).nullish(),
  alt: z.string().max(200).nullish(),
});

export async function registerPhotos(
  vehicleId: string,
  photos: unknown,
): Promise<ActionResult<{ count: number }>> {
  const parsed = z
    .object({ vehicleId: uuidSchema, photos: z.array(photoSchema).min(1).max(MAX_VEHICLE_IMAGES) })
    .safeParse({ vehicleId, photos });
  if (!parsed.success) return invalidInput(parsed.error, 'Invalid photos');
  const { supabase } = await requireConsole();
  const result = await attempt(async () => ({
    count: (
      await addVehicleImages(supabase, parsed.data.vehicleId, parsed.data.photos as UploadedPhoto[])
    ).length,
  }));
  if (result.ok) revalidateInventory(parsed.data.vehicleId);
  return result;
}

export async function reorderPhotos(
  vehicleId: string,
  orderedIds: unknown,
): Promise<ActionResult<null>> {
  const parsed = z
    .object({ vehicleId: uuidSchema, orderedIds: z.array(uuidSchema).min(1) })
    .safeParse({ vehicleId, orderedIds });
  if (!parsed.success) return invalidInput(parsed.error, 'Invalid photo order');
  const { supabase } = await requireConsole();
  const result = await attempt(async () => {
    await reorderVehicleImages(supabase, parsed.data.vehicleId, parsed.data.orderedIds);
    return null;
  });
  if (result.ok) revalidateInventory(parsed.data.vehicleId);
  return result;
}

export async function deletePhoto(vehicleId: string, image: unknown): Promise<ActionResult<null>> {
  const parsed = z
    .object({
      vehicleId: uuidSchema,
      image: z.object({ id: uuidSchema, storage_path: z.string().min(1) }),
    })
    .safeParse({ vehicleId, image });
  if (!parsed.success) return invalidInput(parsed.error, 'Invalid photo');
  const { supabase } = await requireConsole();
  // The storage path must belong to this vehicle's row; the DB delete (RLS) is the real check.
  const result = await attempt(async () => {
    await deleteVehicleImage(supabase, parsed.data.image);
    return null;
  });
  if (result.ok) revalidateInventory(parsed.data.vehicleId);
  return result;
}

export async function decodeVinAction(vin: unknown): Promise<ActionResult<VinDecodeResult>> {
  const parsed = vinSchema.safeParse(vin);
  if (!parsed.success) return invalidInput(parsed.error, 'Enter a valid 17-character VIN');
  const { supabase } = await requireConsole();
  try {
    return { ok: true, data: await decodeVin(supabase, parsed.data) };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('UNDECODABLE_VIN')) {
      return {
        ok: false,
        error: 'That VIN could not be decoded. Check it, or fill in the details by hand.',
      };
    }
    if (message.startsWith('DECODER_UNAVAILABLE')) {
      return { ok: false, error: 'The VIN decoder is not responding. Try again in a minute.' };
    }
    return dbFailure(error);
  }
}
