import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, QueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Keep cached screens around long enough for the persisted cache to be useful.
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
    },
  },
});

/** Persists the query cache so cold starts render the last-seen inventory instantly. */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'cp-query-cache',
  throttleTime: 1000,
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: 24 * 60 * 60 * 1000,
  // A new app version discards caches written by older code.
  buster: Constants.expoConfig?.version ?? 'dev',
};

// Refetch stale queries when the app returns to the foreground (React Native has no window focus).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
}
