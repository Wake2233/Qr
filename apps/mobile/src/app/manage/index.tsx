import { consoleNavItems, type ConsoleNavItem } from '@cp/core';
import { Link } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/text';
import { useSession } from '@/providers/session-provider';

const statusClass: Record<string, string> = {
  approved: 'bg-success/15 text-success',
  pending: 'bg-warning/15 text-warning',
  rejected: 'bg-destructive/15 text-destructive',
  suspended: 'bg-destructive/15 text-destructive',
};

/** Sections with native screens; the rest open the placeholder / "use the web console" screen. */
const NATIVE = { inventory: '/manage/inventory', dealers: '/manage/dealers' } as const;

function SectionRow({ item }: { item: ConsoleNavItem }) {
  const href =
    item.id in NATIVE
      ? NATIVE[item.id as keyof typeof NATIVE]
      : ({ pathname: '/manage/[section]', params: { section: item.id } } as const);
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        className="min-h-12 flex-row items-center justify-between border-b border-border px-4 py-3 active:bg-muted"
      >
        <Text variant="body">{item.label}</Text>
        <Text variant="muted">›</Text>
      </Pressable>
    </Link>
  );
}

export default function ManageHomeScreen() {
  const { context } = useSession();
  if (!context) return null;

  const items = consoleNavItems({
    role: context.profile.role,
    memberships: context.memberships.map((m) => m.role),
  }).filter((item) => item.id !== 'overview');
  const groups = [
    { id: 'workspace', label: 'Workspace' },
    { id: 'admin', label: 'Admin' },
  ] as const;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 px-4 py-6">
      <View className="gap-1">
        <Text variant="display">
          Welcome{context.profile.full_name ? `, ${context.profile.full_name}` : ''}
        </Text>
        <Text variant="muted">Signed in as {context.profile.role}.</Text>
      </View>

      {context.memberships.map((m) => (
        <View key={m.dealerId} className="gap-2 rounded-lg border border-border bg-card p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text variant="heading">{m.dealer.display_name}</Text>
              <Text variant="caption" className="capitalize">
                {m.role}
              </Text>
            </View>
            <Text
              className={`overflow-hidden rounded-full px-2.5 py-1 font-sans-medium text-xs capitalize ${statusClass[m.dealer.status] ?? ''}`}
            >
              {m.dealer.status}
            </Text>
          </View>
          {m.dealer.status === 'pending' ? (
            <Text variant="caption">
              Awaiting admin approval. You can prepare drafts; publishing unlocks once approved.
            </Text>
          ) : null}
        </View>
      ))}

      {groups.map((group) => {
        const groupItems = items.filter((item) => item.group === group.id);
        if (groupItems.length === 0) return null;
        return (
          <View key={group.id} className="gap-2">
            <Text variant="caption" className="px-1 font-sans-medium uppercase tracking-wide">
              {group.label}
            </Text>
            <View className="overflow-hidden rounded-lg border border-border bg-card">
              {groupItems.map((item) => (
                <SectionRow key={item.id} item={item} />
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
