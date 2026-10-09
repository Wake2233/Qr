import type { SessionContext } from '@cp/api';

import { consoleGate } from './console-gate';

const ctx = (canAccessConsole: boolean): SessionContext => ({
  userId: 'u1',
  email: 'a@b.co',
  profile: { full_name: null, role: canAccessConsole ? 'dealer' : 'buyer' },
  memberships: [],
  canAccessConsole,
});

describe('consoleGate', () => {
  it('waits while the session loads', () => {
    expect(consoleGate(true, null)).toBe('loading');
  });

  it('sends signed-out users to sign in', () => {
    expect(consoleGate(false, null)).toBe('signed-out');
  });

  it('denies buyers and allows dealers/admins', () => {
    expect(consoleGate(false, ctx(false))).toBe('denied');
    expect(consoleGate(false, ctx(true))).toBe('allowed');
  });
});
