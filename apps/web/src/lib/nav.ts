import type { ConsoleSection } from '@cp/core';
import {
  BadgeCheck,
  BookOpen,
  Car,
  Inbox,
  Landmark,
  LayoutDashboard,
  ScrollText,
  Settings,
  Store,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

/** Storefront primary navigation. */
export const storefrontNav = [
  { href: '/inventory', label: 'Inventory' },
  { href: '/financing', label: 'Financing' },
  { href: '/sell-with-us', label: 'Sell with us' },
  { href: '/contact', label: 'Contact' },
] as const;

/** Console section → route, icon and the phase that delivers it (for placeholders). */
export const consoleRoutes: Record<
  ConsoleSection,
  { href: string; icon: LucideIcon; phase: number }
> = {
  overview: { href: '/dashboard', icon: LayoutDashboard, phase: 3 },
  inventory: { href: '/dashboard/inventory', icon: Car, phase: 4 },
  leads: { href: '/dashboard/leads', icon: Inbox, phase: 6 },
  finance: { href: '/dashboard/finance', icon: Landmark, phase: 6 },
  dealer: { href: '/dashboard/dealer', icon: Store, phase: 4 },
  dealers: { href: '/dashboard/dealers', icon: BadgeCheck, phase: 4 },
  catalog: { href: '/dashboard/catalog', icon: BookOpen, phase: 4 },
  settings: { href: '/dashboard/settings', icon: Settings, phase: 4 },
  users: { href: '/dashboard/users', icon: UserCog, phase: 4 },
  audit: { href: '/dashboard/audit', icon: ScrollText, phase: 7 },
};
