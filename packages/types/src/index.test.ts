import { describe, expectTypeOf, it } from 'vitest';

import type { ActionResult, Brand } from './index';

describe('shared types', () => {
  it('narrows ActionResult on ok', () => {
    const result = { ok: true, data: 1 } as ActionResult<number>;
    if (result.ok) expectTypeOf(result.data).toEqualTypeOf<number>();
    else expectTypeOf(result.error).toEqualTypeOf<string>();
  });

  it('keeps branded types distinct from their base', () => {
    expectTypeOf<Brand<string, 'VehicleId'>>().not.toEqualTypeOf<string>();
  });
});
