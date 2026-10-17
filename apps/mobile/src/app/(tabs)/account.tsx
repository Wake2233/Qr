import { Link } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Segmented } from '@/components/segmented';
import { useSession } from '@/providers/session-provider';
import { usePreferencesStore } from '@/stores/preferences';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export default function AccountScreen() {
  const { loading, context, signOut } = useSession();
  const theme = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-1 gap-6 px-4 pt-6">
        <Text className="text-3xl font-bold text-foreground">Account</Text>
        {loading ? (
          <ActivityIndicator />
        ) : context ? (
          <View className="gap-4">
            <View className="gap-1 rounded-lg border border-border bg-card p-4">
              <Text className="text-base font-semibold text-foreground">
                {context.profile.full_name ?? 'Signed in'}
              </Text>
              <Text className="text-sm text-muted-foreground">{context.email}</Text>
            </View>
            {context.canAccessConsole ? (
              <Link href="/manage" asChild>
                <Button title="Open dealer console" />
              </Link>
            ) : (
              <Link href="/sell-with-us" asChild>
                <Button title="Sell with us" variant="outline" />
              </Link>
            )}
            <Button title="Sign out" variant="outline" onPress={() => void signOut()} />
          </View>
        ) : (
          <View className="gap-4">
            <Text className="text-base text-muted-foreground">
              Sign in to save cars, track inquiries, or manage your dealership.
            </Text>
            <Link href="/sign-in" asChild>
              <Button title="Sign in" />
            </Link>
          </View>
        )}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">Appearance</Text>
          <Segmented label="Appearance" options={THEMES} value={theme} onChange={setTheme} />
        </View>
      </View>
    </SafeAreaView>
  );
}
