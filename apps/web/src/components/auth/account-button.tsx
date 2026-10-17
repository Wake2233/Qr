'use client';

import { Heart, LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import NextLink from 'next/link';

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
import { Link, useRouter } from '@/i18n/navigation';

/** Header auth control. Client-side so public pages stay statically renderable. */
export function AccountButton() {
  const { user, context, supabase } = useAuth();
  const router = useRouter();
  const t = useTranslations('Header');

  if (user === undefined) return <div className="h-9 w-20" aria-hidden />;
  if (!user) {
    return (
      <Button asChild size="sm">
        <NextLink href="/login">{t('signIn')}</NextLink>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t('accountMenu')}>
          <UserRound /> <span className="hidden sm:inline">{t('account')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/favorites">
            <Heart /> {t('savedVehicles')}
          </Link>
        </DropdownMenuItem>
        {context?.canAccessConsole ? (
          <DropdownMenuItem asChild>
            <NextLink href="/dashboard">
              <LayoutDashboard /> {t('dashboard')}
            </NextLink>
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
          <LogOut /> {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
