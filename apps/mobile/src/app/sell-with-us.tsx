import { applyAsDealer } from '@cp/api';
import { parseDbError } from '@cp/core';
import { dealerApplicationSchema, type DealerApplicationInput } from '@cp/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Haptics from 'expo-haptics';
import { Link, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { toast } from 'sonner-native';

import { Button } from '@/components/button';
import { DealerStatusChip } from '@/components/console/status-chip';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

type Values = DealerApplicationInput;

const FIELDS: {
  name: Exclude<FieldPath<Values>, 'description'>;
  label: string;
  keyboard?: 'phone-pad' | 'email-address' | 'url';
  autoComplete?: 'tel' | 'email' | 'postal-code' | 'street-address' | 'organization';
}[] = [
  { name: 'display_name', label: 'Dealership name', autoComplete: 'organization' },
  { name: 'legal_name', label: 'Legal business name (optional)' },
  { name: 'phone_e164', label: 'Phone', keyboard: 'phone-pad', autoComplete: 'tel' },
  { name: 'whatsapp_e164', label: 'WhatsApp number', keyboard: 'phone-pad' },
  { name: 'email', label: 'Business email', keyboard: 'email-address', autoComplete: 'email' },
  { name: 'website', label: 'Website (optional)', keyboard: 'url' },
  { name: 'address_line1', label: 'Street address', autoComplete: 'street-address' },
  { name: 'city', label: 'City' },
  { name: 'state', label: 'State' },
  { name: 'postal_code', label: 'ZIP code', autoComplete: 'postal-code' },
  { name: 'license_number', label: 'Dealer license number' },
];

export default function SellWithUsScreen() {
  const router = useRouter();
  const { loading, context, refresh } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(dealerApplicationSchema),
    defaultValues: {
      display_name: '',
      phone_e164: '',
      whatsapp_e164: '',
      email: context?.email ?? '',
      address_line1: '',
      city: '',
      state: '',
      postal_code: '',
      license_number: '',
    },
  });

  const membership =
    context?.memberships.find((m) => m.role === 'owner' && m.dealer.status === 'pending') ??
    context?.memberships.find((m) => m.dealer.status === 'approved');

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      await applyAsDealer(supabase, dealerApplicationSchema.parse(values));
      await refresh();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('Application received');
    } catch (submitError) {
      setError(parseDbError(submitError).message);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <Stack.Screen options={{ title: 'Sell with us', headerShown: true }} />
      <ScrollView contentContainerClassName="gap-5 p-4 pb-16" keyboardShouldPersistTaps="handled">
        <View className="gap-2">
          <Text variant="display">List your inventory</Text>
          <Text variant="muted">
            Buyers contact you directly on WhatsApp or by phone from every listing. Manage cars from
            the web console or this app.
          </Text>
        </View>

        {loading ? null : !context ? (
          <View className="gap-3 rounded-lg border border-border bg-card p-4">
            <Text variant="heading">Sign in to apply</Text>
            <Link href="/sign-in" asChild>
              <Button title="Sign in" />
            </Link>
          </View>
        ) : membership ? (
          <View className="gap-3 rounded-lg border border-border bg-card p-4">
            <View className="flex-row items-center gap-3">
              <Text variant="heading" className="flex-1">
                {membership.dealer.display_name}
              </Text>
              <DealerStatusChip status={membership.dealer.status} />
            </View>
            <Text variant="caption">
              {membership.dealer.status === 'pending'
                ? 'Application received. You can prepare draft listings now; they go live once you are approved.'
                : 'Your dealership is approved.'}
            </Text>
            <Button title="Open the console" onPress={() => router.replace('/manage')} />
          </View>
        ) : (
          <View className="gap-4">
            {error ? (
              <View
                accessibilityRole="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 p-3"
              >
                <Text variant="label" className="text-destructive">
                  {error}
                </Text>
              </View>
            ) : null}
            {FIELDS.map((f) => (
              <Controller
                key={f.name}
                control={form.control}
                name={f.name}
                render={({ field, fieldState }) => (
                  <TextField
                    label={f.label}
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    keyboardType={f.keyboard}
                    autoComplete={f.autoComplete}
                    autoCapitalize={f.keyboard ? 'none' : 'words'}
                    error={fieldState.error?.message}
                  />
                )}
              />
            ))}
            <Controller
              control={form.control}
              name="description"
              render={({ field }) => (
                <TextField
                  label="About your dealership (optional)"
                  multiline
                  textAlignVertical="top"
                  className="h-28 py-3"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                />
              )}
            />
            <Text variant="caption">
              Supporting documents (license, insurance) can be uploaded from the web console.
            </Text>
            <Button
              title="Submit application"
              loading={submitting}
              onPress={() => void onSubmit()}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
