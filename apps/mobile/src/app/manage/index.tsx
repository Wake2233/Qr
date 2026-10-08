import { ScrollView, Text, View } from 'react-native';

import { useSession } from '@/providers/session-provider';

const statusClass: Record<string, string> = {
  approved: 'bg-success/15 text-success',
  pending: 'bg-warning/15 text-warning',
  rejected: 'bg-destructive/15 text-destructive',
  suspended: 'bg-destructive/15 text-destructive',
};

export default function ManageHomeScreen() {
  const { context } = useSession();
  if (!context) return null;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 px-4 py-6">
      <View className="gap-1">
        <Text className="text-2xl font-bold text-foreground">
          Welcome{context.profile.full_name ? `, ${context.profile.full_name}` : ''}
        </Text>
        <Text className="text-base text-muted-foreground">
          Signed in as {context.profile.role}. Inventory tools arrive in Phase 4.
        </Text>
      </View>
      {context.memberships.map((m) => (
        <View key={m.dealerId} className="gap-2 rounded-lg border border-border bg-card p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                {m.dealer.display_name}
              </Text>
              <Text className="text-sm capitalize text-muted-foreground">{m.role}</Text>
            </View>
            <Text
              className={`overflow-hidden rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass[m.dealer.status] ?? ''}`}
            >
              {m.dealer.status}
            </Text>
          </View>
          {m.dealer.status === 'pending' ? (
            <Text className="text-sm text-muted-foreground">
              Awaiting admin approval. You can prepare drafts; publishing unlocks once approved.
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}
