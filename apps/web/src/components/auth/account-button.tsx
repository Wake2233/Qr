'use client';

import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

/** Header auth control. Client-side so public pages stay statically renderable. */
export function AccountButton() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  if (user === undefined) return <div className="h-9 w-20" aria-hidden />;
  return (
    <Button asChild variant={user ? 'outline' : 'default'} size="sm">
      <Link href={user ? '/dashboard' : '/login'}>{user ? 'Dashboard' : 'Sign in'}</Link>
    </Button>
  );
}
