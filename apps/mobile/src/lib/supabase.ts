import 'react-native-url-polyfill/auto';

import type { Database } from '@cp/types';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env } from './env';
import { LargeSecureStore } from './large-secure-store';

export const supabase = createClient<Database>(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      // SecureStore is native-only; the web build (dev tooling) falls back to default storage.
      ...(Platform.OS !== 'web' ? { storage: new LargeSecureStore() } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  },
);

// Refresh tokens only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
