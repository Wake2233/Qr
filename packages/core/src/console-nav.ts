/**
 * Management-console navigation shared by web (/dashboard sidebar) and mobile (/manage).
 * UI only: RLS decides what each section actually returns.
 */
import type { Enums } from '@cp/types';

import type { AppRole } from './access';

export type ConsoleSection =
  | 'overview'
  | 'inventory'
  | 'leads'
  | 'finance'
  | 'dealer'
  | 'dealers'
  | 'catalog'
  | 'settings'
  | 'users'
  | 'audit';

export interface ConsoleNavItem {
  id: ConsoleSection;
  label: string;
  group: 'workspace' | 'admin';
}

const ITEMS: (ConsoleNavItem & { visible: (ctx: ConsoleNavContext) => boolean })[] = [
  { id: 'overview', label: 'Overview', group: 'workspace', visible: () => true },
  { id: 'inventory', label: 'Inventory', group: 'workspace', visible: () => true },
  { id: 'leads', label: 'Leads', group: 'workspace', visible: () => true },
  { id: 'finance', label: 'Finance apps', group: 'workspace', visible: () => true },
  {
    id: 'dealer',
    label: 'Dealer profile',
    group: 'workspace',
    visible: ({ memberships }) => memberships.some((m) => m === 'owner' || m === 'manager'),
  },
  { id: 'dealers', label: 'Dealers', group: 'admin', visible: ({ role }) => role === 'admin' },
  { id: 'catalog', label: 'Catalog', group: 'admin', visible: ({ role }) => role === 'admin' },
  {
    id: 'settings',
    label: 'Site settings',
    group: 'admin',
    visible: ({ role }) => role === 'admin',
  },
  { id: 'users', label: 'Users', group: 'admin', visible: ({ role }) => role === 'admin' },
  { id: 'audit', label: 'Audit log', group: 'admin', visible: ({ role }) => role === 'admin' },
];

export interface ConsoleNavContext {
  role: AppRole;
  /** The user's membership role in each dealer they belong to. */
  memberships: Enums<'dealer_member_role'>[];
}

export function consoleNavItems(ctx: ConsoleNavContext): ConsoleNavItem[] {
  return ITEMS.filter((item) => item.visible(ctx)).map(({ id, label, group }) => ({
    id,
    label,
    group,
  }));
}
