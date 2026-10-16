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

/** Storefront primary navigation. */
export const storefrontNav = [
  { href: '/inventory', label: 'Inventory' },
  { href: '/sell-with-us', label: 'Sell with us' },
  { href: '/contact', label: 'Contact' },
] as const;

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
