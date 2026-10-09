import { describe, expect, it } from 'vitest';

import { queryKeys } from './query-keys';

describe('queryKeys', () => {
  it('nests every vehicle key under the vehicles root for prefix invalidation', () => {
    const keys = [
      queryKeys.vehicles.list({ make: ['bmw'] }),
      queryKeys.vehicles.infinite({}),
      queryKeys.vehicles.detail('2021-bmw-x5'),
      queryKeys.vehicles.byIds(['a']),
      queryKeys.vehicles.facets({}),
      queryKeys.vehicles.rail('price-drops'),
      queryKeys.vehicles.similar('v1'),
      queryKeys.vehicles.compare(['a']),
    ];
    for (const key of keys) expect(key[0]).toBe(queryKeys.vehicles.all[0]);
    expect(queryKeys.vehicles.list({ make: ['bmw'] })).toEqual([
      'vehicles',
      'list',
      { make: ['bmw'] },
    ]);
  });

  it('copies id arrays so later mutation cannot change a cached key', () => {
    const ids = ['a', 'b'];
    const key = queryKeys.vehicles.byIds(ids);
    ids.push('c');
    expect(key).toEqual(['vehicles', 'by-ids', ['a', 'b']]);
  });

  it('separates anonymous and per-user favorites and catalog scopes', () => {
    expect(queryKeys.favorites.ids('u1')).toEqual(['favorites', 'u1']);
    expect(queryKeys.catalog.models()).toEqual(['catalog', 'models', 'all']);
    expect(queryKeys.catalog.models(3)).toEqual(['catalog', 'models', 3]);
    expect(queryKeys.settings.site()).toEqual(['settings', 'site']);
    expect(queryKeys.dealers.detail('x')).toEqual(['dealers', 'detail', 'x']);
    expect(queryKeys.catalog.makes()).toEqual(['catalog', 'makes']);
    expect(queryKeys.catalog.features()).toEqual(['catalog', 'features']);
  });

  it('nests every console key under the console root', () => {
    const scope = { kind: 'dealers', dealerIds: ['d1'] } as const;
    const keys = [
      queryKeys.console.vehicles(scope, { status: 'draft' }),
      queryKeys.console.vehicle('v1'),
      queryKeys.console.dealers({ status: 'pending' }),
      queryKeys.console.dealer('d1'),
      queryKeys.console.catalog(),
      queryKeys.console.users('', 1),
    ];
    for (const key of keys) expect(key[0]).toBe('console');
    expect(queryKeys.console.vehicles(scope, {})).toEqual(['console', 'vehicles', scope, {}]);
  });
});
