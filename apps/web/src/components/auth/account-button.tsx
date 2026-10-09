'use client';

import { Heart, LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Header auth control. Client-side so public pages stay statically renderable. */
export function AccountButton() {
  const { user, context, supabase } = useAuth();
  const router = useRouter();

  if (user === undefined) return <div className="h-9 w-20" aria-hidden />;
  if (!user) {
    return (
      <Button asChild size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Account menu">
          <UserRound /> <span className="hidden sm:inline">Account</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/favorites">
            <Heart /> Saved vehicles
          </Link>
        </DropdownMenuItem>
        {context?.canAccessConsole ? (
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard /> Dashboard
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            // Browser sign-out clears the auth cookies and notifies every listener.
            void supabase.auth.signOut().then(() => {
              router.push('/');
              router.refresh();
            });
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
