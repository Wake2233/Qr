import '../global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { useAppTheme } from '@/lib/theme';
import { SessionProvider } from '@/providers/session-provider';

export default function RootLayout() {
  const { scheme, rootStyle, native } = useAppTheme();
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
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
      <SessionProvider>
        <View style={rootStyle} className="flex-1 bg-background">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
            <Stack.Screen name="manage" options={{ headerShown: false }} />
          </Stack>
        </View>
      </SessionProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
