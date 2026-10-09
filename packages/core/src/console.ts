/**
 * Management-console rules shared by the web dashboard and the mobile /manage stack:
 * listing status transitions, photo storage paths and upload sizing.
 * UI only — triggers and RLS remain the authority.
 */
import type { Enums } from '@cp/types';

type ListingStatus = Enums<'listing_status'>;

export interface StatusAction {
  to: ListingStatus;
  label: string;
  /** Publishing actions go through the database publish gate and can fail with MISSING_* errors. */
  publishes: boolean;
}

const ACTIONS: Record<ListingStatus, StatusAction[]> = {
  draft: [
    { to: 'active', label: 'Publish', publishes: true },
    { to: 'archived', label: 'Archive', publishes: false },
  ],
  pending_review: [
    { to: 'active', label: 'Approve and publish', publishes: true },
    { to: 'draft', label: 'Back to draft', publishes: false },
    { to: 'archived', label: 'Archive', publishes: false },
  ],
  active: [
    { to: 'reserved', label: 'Mark reserved', publishes: false },
    { to: 'sold', label: 'Mark sold', publishes: false },
    { to: 'draft', label: 'Unpublish', publishes: false },
    { to: 'archived', label: 'Archive', publishes: false },
  ],
  reserved: [
    { to: 'active', label: 'Back on sale', publishes: false },
    { to: 'sold', label: 'Mark sold', publishes: false },
    { to: 'draft', label: 'Unpublish', publishes: false },
    { to: 'archived', label: 'Archive', publishes: false },
  ],
  sold: [
    { to: 'active', label: 'Back on sale', publishes: false },
    { to: 'archived', label: 'Archive', publishes: false },
  ],
  archived: [{ to: 'draft', label: 'Restore as draft', publishes: false }],
};

/** Status changes offered for a listing. Only admins approve listings waiting for review. */
export function listingStatusActions(
  status: ListingStatus,
  { isAdmin = false }: { isAdmin?: boolean } = {},
): StatusAction[] {
  return ACTIONS[status].filter(
    (action) => isAdmin || !(status === 'pending_review' && action.to === 'active'),
  );
}

/** Statuses buyers can see (mirrors the public vehicles policy, minus recently sold). */
export const LIVE_STATUSES = ['active', 'reserved'] as const satisfies ListingStatus[];

export const MAX_VEHICLE_IMAGES = 40;
/** Uploads are resized so the long edge is at most this many pixels. */
export const IMAGE_MAX_EDGE = 2400;
/** WebP/JPEG quality used when compressing uploads (0–1). */
export const IMAGE_QUALITY = 0.8;

/** `{dealer_id}/{vehicle_id}/{file_id}.webp` — the only layout storage policies accept. */
export function vehicleImagePath(
  dealerId: string,
  vehicleId: string,
  fileId: string,
  extension: 'webp' | 'jpg' = 'webp',
): string {
  return `${dealerId}/${vehicleId}/${fileId}.${extension}`;
}

/** Scales `width × height` down (never up) so the long edge fits `maxEdge`. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge = IMAGE_MAX_EDGE,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) return { width, height };
  const scale = maxEdge / longEdge;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Moves the item at `from` to `to`, returning a new array (photo reordering on both apps). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [item] = next.splice(from, 1) as [T];
  next.splice(to, 0, item);
  return next;
}

/** URL-safe slug for catalog entries: "Land Rover" → "land-rover". */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
