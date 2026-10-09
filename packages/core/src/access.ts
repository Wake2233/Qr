export type AppRole = 'buyer' | 'dealer' | 'admin';

export interface AccessContext {
  role: AppRole;
  /** Number of dealers the user belongs to (any membership role, any dealer status). */
  dealerMemberships: number;
}

/**
 * Whether to show the management console (web /dashboard, mobile (manage)).
 * UI gating only — RLS enforces what each user can actually read or change.
 * Pending dealer owners get access so they can prepare draft listings.
 */
export function canAccessConsole({ role, dealerMemberships }: AccessContext): boolean {
  return role === 'admin' || dealerMemberships > 0;
}

export function isAdmin({ role }: Pick<AccessContext, 'role'>): boolean {
  return role === 'admin';
}
