'use client';

import { useRouter } from 'next/navigation';
import { useTransition, type ComponentProps } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';

/**
 * Signs out with the browser client: it clears the auth cookies *and* notifies every
 * listener, so the storefront header and favorites switch to signed-out immediately.
 */
export function SignOutButton(props: Omit<ComponentProps<typeof Button>, 'onClick'>) {
  const { supabase } = useAuth();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={() =>
        startTransition(async () => {
          await supabase.auth.signOut();
          router.push('/');
          router.refresh();
        })
      }
    >
      Sign out
    </Button>
  );
}
