import { describe, expect, it } from 'vitest';

import { consoleNavItems } from './console-nav';

const ids = (...args: Parameters<typeof consoleNavItems>) =>
  consoleNavItems(...args).map((i) => i.id);

describe('consoleNavItems', () => {
  it('shows staff the shared workspace only', () => {
    expect(ids({ role: 'dealer', memberships: ['staff'] })).toEqual([
      'overview',
      'inventory',
      'leads',
      'finance',
    ]);
  });

  it('adds the dealer profile for owners and managers', () => {
    expect(ids({ role: 'dealer', memberships: ['manager'] })).toContain('dealer');
    expect(ids({ role: 'buyer', memberships: ['owner'] })).toContain('dealer');
  });

  it('adds the admin group for admins', () => {
    const items = consoleNavItems({ role: 'admin', memberships: [] });
    expect(items.filter((i) => i.group === 'admin').map((i) => i.id)).toEqual([
      'dealers',
      'catalog',
      'settings',
      'users',
      'audit',
    ]);
    expect(items.map((i) => i.id)).not.toContain('dealer');
  });
});
