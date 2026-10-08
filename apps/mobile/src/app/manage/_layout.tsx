import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { consoleGate } from '@/lib/console-gate';
import { useSession } from '@/providers/session-provider';

/** Console gate (UI only — RLS enforces what each user can read or change). */
export default function ManageLayout() {
  const { loading, context } = useSession();
  const gate = consoleGate(loading, context);

  if (gate === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }
  if (gate === 'signed-out') return <Redirect href="/sign-in" />;
  if (gate === 'denied') {
    return (
      <View className="flex-1 justify-center gap-3 bg-background px-6">
        <Text className="text-2xl font-bold text-foreground">No dealer access</Text>
        <Text className="text-base text-muted-foreground">
          The management console is for approved dealers and admins.
        </Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerTitle: 'Manage' }} />;
}
