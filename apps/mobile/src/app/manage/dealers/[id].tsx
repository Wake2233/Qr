import { dealerDocumentUrls, useConsoleDealer, useModerateDealer } from '@cp/api';
import { formatPhone, parseDbError } from '@cp/core';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { DealerStatusChip } from '@/components/console/status-chip';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { supabase } from '@/lib/supabase';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View className="gap-0.5">
      <Text variant="caption" className="font-sans-medium uppercase tracking-wide">
        {label}
      </Text>
      <Text>{value || '—'}</Text>
    </View>
  );
}

export default function DealerReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dealer = useConsoleDealer(supabase, id ?? '');
  const moderate = useModerateDealer(supabase);
  const [reasonFor, setReasonFor] = useState<'reject' | 'suspend' | null>(null);
  const [reason, setReason] = useState('');
  const docs = useQuery({
    queryKey: ['console', 'dealer-docs', id, dealer.data?.private?.documents.length ?? 0],
    enabled: Boolean(dealer.data?.private?.documents.length),
    queryFn: () => dealerDocumentUrls(supabase, dealer.data?.private?.documents ?? []),
  });

  if (dealer.isPending) return <ActivityIndicator className="mt-10" />;
  const d = dealer.data;
  if (!d) {
    return (
      <View className="flex-1 bg-background p-6">
        <Text variant="muted">Dealer not found.</Text>
      </View>
    );
  }

  const run = (action: 'approve' | 'reject' | 'suspend', why?: string) =>
    moderate.mutate(
      action === 'approve'
        ? { action, dealer_id: d.id }
        : { action, dealer_id: d.id, reason: why ?? '' },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          toast.success(
            action === 'approve'
              ? `${d.display_name} approved`
              : action === 'reject'
                ? 'Application rejected'
                : 'Dealer suspended',
          );
          setReasonFor(null);
          setReason('');
        },
        onError: (error) => toast.error(parseDbError(error).message),
      },
    );

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-12">
      <Stack.Screen options={{ title: d.display_name }} />
      <View className="flex-row items-center justify-between">
        <DealerStatusChip status={d.status} />
        {d.is_house ? <Text variant="caption">House dealership</Text> : null}
      </View>

      {!d.is_house ? (
        <View className="flex-row flex-wrap gap-3">
          {d.status !== 'approved' ? (
            <Button
              title={d.status === 'suspended' ? 'Reinstate' : 'Approve'}
              loading={moderate.isPending}
              onPress={() => run('approve')}
              className="flex-1"
            />
          ) : null}
          {d.status === 'pending' ? (
            <Button
              title="Reject"
              variant="outline"
              onPress={() => setReasonFor('reject')}
              className="flex-1"
            />
          ) : null}
          {d.status === 'approved' ? (
            <Button
              title="Suspend"
              variant="destructive"
              onPress={() => setReasonFor('suspend')}
              className="flex-1"
            />
          ) : null}
        </View>
      ) : null}

      <View className="gap-3 rounded-lg border border-border bg-card p-4">
        <Row label="Legal name" value={d.legal_name} />
        <Row label="Phone" value={d.phone_e164 ? formatPhone(d.phone_e164) : null} />
        <Row label="WhatsApp" value={d.whatsapp_e164 ? formatPhone(d.whatsapp_e164) : null} />
        <Row label="Email" value={d.email} />
        <Row label="Website" value={d.website} />
        <Row
          label="Address"
          value={[d.address_line1, d.city, d.state, d.postal_code].filter(Boolean).join(', ')}
        />
        <Row label="License number" value={d.private?.license_number} />
        {d.rejection_reason ? <Row label="Last reason given" value={d.rejection_reason} /> : null}
      </View>

      <View className="gap-2 rounded-lg border border-border bg-card p-4">
        <Text variant="title">Documents</Text>
        {(d.private?.documents.length ?? 0) === 0 ? (
          <Text variant="caption">No documents uploaded.</Text>
        ) : (
          (docs.data ?? []).map((doc) => (
            <Pressable
              key={doc.path}
              accessibilityRole="link"
              disabled={!doc.url}
              onPress={() => doc.url && void WebBrowser.openBrowserAsync(doc.url)}
              className="min-h-11 justify-center"
            >
              <Text className="text-primary underline">{doc.name}</Text>
            </Pressable>
          ))
        )}
      </View>

      <View className="gap-2 rounded-lg border border-border bg-card p-4">
        <Text variant="title">Team</Text>
        {d.team.map((member) => (
          <View key={member.user_id}>
            <Text variant="heading">{member.full_name ?? member.email}</Text>
            <Text variant="caption">
              {member.email} · {member.role}
            </Text>
          </View>
        ))}
      </View>

      <Modal
        visible={reasonFor !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReasonFor(null)}
      >
        <SafeAreaView className="flex-1 gap-4 bg-background p-5">
          <Text variant="title">
            {reasonFor === 'reject' ? 'Reject application' : 'Suspend dealer'}
          </Text>
          <Text variant="caption">
            {reasonFor === 'reject'
              ? 'The applicant sees this reason and can apply again.'
              : 'All of this dealer’s listings disappear from the storefront immediately.'}
          </Text>
          <TextField
            label="Reason"
            multiline
            textAlignVertical="top"
            className="h-32 py-3"
            value={reason}
            onChangeText={setReason}
            autoFocus
          />
          <View className="flex-row gap-3">
            <Button
              title="Cancel"
              variant="outline"
              className="flex-1"
              onPress={() => setReasonFor(null)}
            />
            <Button
              title={reasonFor === 'reject' ? 'Reject' : 'Suspend'}
              variant="destructive"
              className="flex-1"
              disabled={reason.trim().length < 3}
              loading={moderate.isPending}
              onPress={() => reasonFor && run(reasonFor, reason)}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}
