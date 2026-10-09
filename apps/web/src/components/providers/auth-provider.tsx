'use client';

import { getSessionContext, type AppSupabaseClient, type SessionContext } from '@cp/api';
import type { User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { createClient } from '@/lib/supabase/client';

interface AuthState {
  /** undefined while the stored session is being read */
  user: User | null | undefined;
  /** profile + memberships once loaded (null when signed out) */
  context: SessionContext | null;
  supabase: AppSupabaseClient;
  /** Re-reads the session (after a Server Action signed the user in via cookies). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Browser auth state for storefront widgets (favorites, account menu). Public pages stay
 * static: the user is read on the client, never during the server render.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(createClient);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [context, setContext] = useState<SessionContext | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  }, [supabase]);

  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, [supabase, refresh]);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // Deferred out of the auth callback (supabase-js recommendation).
    void getSessionContext(supabase)
      .then((next) => {
        if (!cancelled) setContext(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  return (
    <AuthContext.Provider value={{ user, context: userId ? context : null, supabase, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
