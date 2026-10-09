import { consoleNavItems, type ConsoleSection } from '@cp/core';
import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/text';
import { consolePhases } from '@/lib/console-routes';
import { env } from '@/lib/env';
import { useSession } from '@/providers/session-provider';

/** Desk-work sections that live on the web console only (PLAN.md §7). */
const WEB_ONLY: ConsoleSection[] = ['dealer', 'catalog', 'settings', 'users'];

/** Placeholder for console sections built in later phases (same visibility rules as web). */
export default function ManageSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { context } = useSession();
  const item = context
    ? consoleNavItems({
        role: context.profile.role,
        memberships: context.memberships.map((m) => m.role),
      }).find((i) => i.id === section)
    : undefined;

  return (
    <View className="flex-1 gap-4 bg-background px-6 pt-8">
      <Stack.Screen options={{ title: item?.label ?? 'Not available' }} />
      {item && WEB_ONLY.includes(item.id) ? (
        <>
          <Text variant="display">{item.label}</Text>
          <Text variant="muted">
            {item.label} is managed from the web console at{' '}
            {env.EXPO_PUBLIC_SITE_URL.replace(/^https?:\/\//, '')}/dashboard.
          </Text>
        </>
      ) : item ? (
        <>
          <Text className="self-start overflow-hidden rounded-full bg-primary/10 px-3 py-1 font-sans-medium text-xs text-primary">
            Arrives in Phase {consolePhases[item.id as ConsoleSection]}
          </Text>
          <Text variant="display">{item.label}</Text>
          <Text variant="muted">This part of the console is being built.</Text>
        </>
      ) : (
        <Text variant="muted">This section isn&apos;t available to your account.</Text>
      )}
    </View>
  );
}
