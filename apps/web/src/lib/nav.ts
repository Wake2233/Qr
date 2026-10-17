import type { ConsoleSection } from '@cp/core';
import {
  BadgeCheck,
  BookOpen,
  House,
  Car,
  Inbox,
  LayoutDashboard,
  ScrollText,
  Settings,
  Store,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

/** Storefront primary navigation (`label` is a key in the `Nav` messages). */
export const storefrontNav = [
  { href: '/inventory', label: 'inventory' },
  { href: '/sell-with-us', label: 'sellWithUs' },
  { href: '/contact', label: 'contact' },
] as const;

/** True on the section's page and its children (`/inventory`, `/inventory/<slug>`). */
export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Console section → route and icon. */
export const consoleRoutes: Record<ConsoleSection, { href: string; icon: LucideIcon }> = {
  overview: { href: '/dashboard', icon: LayoutDashboard },
  inventory: { href: '/dashboard/inventory', icon: Car },
  leads: { href: '/dashboard/leads', icon: Inbox },
  dealer: { href: '/dashboard/dealer', icon: Store },
  dealers: { href: '/dashboard/dealers', icon: BadgeCheck },
  home: { href: '/dashboard/home', icon: House },
  catalog: { href: '/dashboard/catalog', icon: BookOpen },
  settings: { href: '/dashboard/settings', icon: Settings },
  users: { href: '/dashboard/users', icon: UserCog },
  audit: { href: '/dashboard/audit', icon: ScrollText },
};
