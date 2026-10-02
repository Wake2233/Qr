import { describe, expect, it } from 'vitest';

import { queryKeys } from './query-keys';

describe('queryKeys', () => {
  it('nests list keys under the vehicles root for prefix invalidation', () => {
    const key = queryKeys.vehicles.list({ make: 'bmw' });
    expect(key.slice(0, 1)).toEqual(queryKeys.vehicles.all);
    expect(key).toEqual(['vehicles', 'list', { make: 'bmw' }]);
  });

  it('builds detail keys by slug', () => {
    expect(queryKeys.vehicles.detail('2021-bmw-x5')).toEqual(['vehicles', 'detail', '2021-bmw-x5']);
  });
});
