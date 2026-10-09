import '../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  type ErrorBoundaryProps,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Toaster } from 'sonner-native';

import { ErrorFallback } from '@/components/error-fallback';
import { FavoritesSync } from '@/components/favorites-sync';
import { appFonts } from '@/lib/fonts';
import { GestureHandlerRootView } from '@/lib/interop';
import { persistOptions, queryClient } from '@/lib/query-client';
import { useAppTheme } from '@/lib/theme';
import { SessionProvider } from '@/providers/session-provider';

void SplashScreen.preventAutoHideAsync();

/** Root error boundary for any route without its own. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorFallback error={error} retry={retry} />;
}

export default function RootLayout() {
  const { scheme, rootStyle, native } = useAppTheme();
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  // Render with system fonts if loading fails rather than blocking the app.
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView className="flex-1">
      <ThemeProvider
        value={{
          ...navTheme,
          colors: {
            ...navTheme.colors,
            background: native.background,
            card: native.card,
            text: native.foreground,
            primary: native.primary,
            border: native.border,
          },
        }}
      >
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <SessionProvider>
            <FavoritesSync />
            <View style={rootStyle} className="flex-1 bg-background">
              <BottomSheetModalProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="manage" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="sell-with-us"
                    options={{ headerShown: true, title: 'Sell with us' }}
                  />
                  <Stack.Screen
                    name="vehicle/[slug]"
                    options={{ headerShown: true, title: '', headerBackTitle: 'Back' }}
                  />
                  <Stack.Screen name="compare" options={{ headerShown: true, title: 'Compare' }} />
                </Stack>
              </BottomSheetModalProvider>
            </View>
            <Toaster theme={scheme} position="top-center" richColors />
          </SessionProvider>
        </PersistQueryClientProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
