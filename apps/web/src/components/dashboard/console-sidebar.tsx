'use client';

import type { ConsoleNavItem } from '@cp/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { consoleRoutes } from '@/lib/nav';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string) {
  return href === '/dashboard'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** Role-aware console navigation (items come from @cp/core consoleNavItems, shared with mobile). */
export function ConsoleSidebar({
  items,
  onNavigate,
}: {
  items: ConsoleNavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = [
    { id: 'workspace', label: 'Workspace' },
    { id: 'admin', label: 'Admin' },
  ] as const;

  return (
    <nav aria-label="Console" className="flex flex-col gap-6">
      {groups.map((group) => {
        const groupItems = items.filter((item) => item.group === group.id);
        if (groupItems.length === 0) return null;
        return (
          <div key={group.id} className="flex flex-col gap-1">
            <p className="text-muted-foreground px-3 pb-1 text-xs font-medium tracking-wide uppercase">
              {group.label}
            </p>
            {groupItems.map((item) => {
              const { href, icon: Icon } = consoleRoutes[item.id];
              const active = isActive(pathname, href);
              return (
                <Link
                  key={item.id}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'focus-visible:ring-ring/50 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none focus-visible:ring-[3px]',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
