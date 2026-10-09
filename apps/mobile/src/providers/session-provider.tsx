import { getSessionContext, type SessionContext } from '@cp/api';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

interface SessionState {
  /** true until the stored session and profile have been loaded */
  loading: boolean;
  session: Session | null;
  context: SessionContext | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionStateContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [context, setContext] = useState<SessionContext | null>(null);

  const load = useCallback(async (next: Session | null) => {
    setSession(next);
    setContext(next ? await getSessionContext(supabase) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      // Defer DB calls out of the auth callback (supabase-js recommendation).
      setTimeout(() => void load(next), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const value: SessionState = {
    loading,
    session,
    context,
    refresh: async () => load((await supabase.auth.getSession()).data.session),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <SessionStateContext.Provider value={value}>{children}</SessionStateContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionStateContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
