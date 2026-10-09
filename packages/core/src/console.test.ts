import { describe, expect, it } from 'vitest';

import {
  fitWithin,
  IMAGE_MAX_EDGE,
  listingStatusActions,
  moveItem,
  slugify,
  vehicleImagePath,
} from './console';

describe('listingStatusActions', () => {
  it('offers publish and archive for drafts', () => {
    expect(listingStatusActions('draft')).toEqual([
      { to: 'active', label: 'Publish', publishes: true },
      { to: 'archived', label: 'Archive', publishes: false },
    ]);
  });

  it('lets only admins approve listings waiting for review', () => {
    expect(listingStatusActions('pending_review').map((a) => a.to)).toEqual(['draft', 'archived']);
    expect(listingStatusActions('pending_review', { isAdmin: true }).map((a) => a.to)).toEqual([
      'active',
      'draft',
      'archived',
    ]);
  });

  it('covers every lifecycle state', () => {
    expect(listingStatusActions('active').map((a) => a.to)).toEqual([
      'reserved',
      'sold',
      'draft',
      'archived',
    ]);
    expect(listingStatusActions('reserved').map((a) => a.to)).toContain('active');
    expect(listingStatusActions('sold').map((a) => a.to)).toEqual(['active', 'archived']);
    expect(listingStatusActions('archived')).toEqual([
      { to: 'draft', label: 'Restore as draft', publishes: false },
    ]);
  });
});

describe('vehicleImagePath', () => {
  it('builds the dealer/vehicle/file layout', () => {
    expect(vehicleImagePath('d1', 'v1', 'f1')).toBe('d1/v1/f1.webp');
    expect(vehicleImagePath('d1', 'v1', 'f1', 'jpg')).toBe('d1/v1/f1.jpg');
  });
});

describe('fitWithin', () => {
  it('scales the long edge down to the limit', () => {
    expect(fitWithin(4800, 3200)).toEqual({ width: IMAGE_MAX_EDGE, height: 1600 });
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });

  it('never upscales', () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
  });
});

describe('moveItem', () => {
  it('moves an item and leaves the input untouched', () => {
    const input = ['a', 'b', 'c', 'd'];
    expect(moveItem(input, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveItem(input, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(input).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ignores out-of-range indexes', () => {
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
  });
});

describe('slugify', () => {
  it('makes URL-safe slugs', () => {
    expect(slugify('Land Rover')).toBe('land-rover');
    expect(slugify('  Citroën C4 — Picasso! ')).toBe('citroen-c4-picasso');
    expect(slugify('Mercedes-Benz')).toBe('mercedes-benz');
  });
});
