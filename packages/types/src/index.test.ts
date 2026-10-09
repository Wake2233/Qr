import { describe, expect, expectTypeOf, it } from 'vitest';

import { Constants, type ActionResult, type Brand, type Enums, type Tables } from './index';

describe('shared types', () => {
  it('narrows ActionResult on ok', () => {
    const result = { ok: true, data: 1 } as ActionResult<number>;
    if (result.ok) expectTypeOf(result.data).toEqualTypeOf<number>();
    else expectTypeOf(result.error).toEqualTypeOf<string>();
  });

  it('keeps branded types distinct from their base', () => {
    expectTypeOf<Brand<string, 'VehicleId'>>().not.toEqualTypeOf<string>();
  });

  it('exposes generated row and enum types', () => {
    expectTypeOf<Tables<'vehicles'>['price_cents']>().toEqualTypeOf<number | null>();
    expectTypeOf<Enums<'listing_status'>>().toEqualTypeOf<
      'draft' | 'pending_review' | 'active' | 'reserved' | 'sold' | 'archived'
    >();
  });

  it('exports enum values at runtime for UI pickers', () => {
    expect(Constants.public.Enums.fuel_type).toContain('electric');
  });
});
