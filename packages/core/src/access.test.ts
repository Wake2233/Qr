import { describe, expect, it } from 'vitest';

import { canAccessConsole, isAdmin } from './access';

describe('canAccessConsole', () => {
  it('allows admins without memberships', () => {
    expect(canAccessConsole({ role: 'admin', dealerMemberships: 0 })).toBe(true);
  });

  it('allows any dealer member, including pending owners still marked buyer', () => {
    expect(canAccessConsole({ role: 'dealer', dealerMemberships: 1 })).toBe(true);
    expect(canAccessConsole({ role: 'buyer', dealerMemberships: 1 })).toBe(true);
  });

  it('blocks plain buyers', () => {
    expect(canAccessConsole({ role: 'buyer', dealerMemberships: 0 })).toBe(false);
  });
});

describe('isAdmin', () => {
  it('is true only for admins', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true);
    expect(isAdmin({ role: 'dealer' })).toBe(false);
  });
});
