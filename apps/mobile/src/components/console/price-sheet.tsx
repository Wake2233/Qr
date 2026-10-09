import { centsToDollarInput, formatPrice, parseDollarsToCents } from '@cp/core';
import { priceCentsSchema } from '@cp/validators';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';

/** Quick price edit from a swipe action. */
export function PriceSheet({
  visible,
  title,
  priceCents,
  saving,
  onSave,
  onClose,
}: {
  visible: boolean;
  title: string;
  priceCents: number | null;
  saving: boolean;
  onSave: (cents: number) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(centsToDollarInput(priceCents));
  const [error, setError] = useState<string | undefined>();
  const [shownFor, setShownFor] = useState<number | null>(priceCents);
  if (priceCents !== shownFor) {
    setShownFor(priceCents);
    setText(centsToDollarInput(priceCents));
    setError(undefined);
  }

  const submit = () => {
    const parsed = priceCentsSchema.safeParse(parseDollarsToCents(text));
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Enter a price');
    onSave(parsed.data);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable
          accessibilityLabel="Close"
          onPress={onClose}
          className="flex-1 justify-end bg-black/50"
        >
          <Pressable onPress={() => {}} className="gap-4 rounded-t-2xl bg-card p-5 pb-10">
            <View className="gap-1">
              <Text variant="title">Edit price</Text>
              <Text variant="caption">
                {title}
                {priceCents ? ` · now ${formatPrice(priceCents)}` : ''}
              </Text>
            </View>
            <TextField
              label="New price ($)"
              autoFocus
              selectTextOnFocus
              keyboardType="decimal-pad"
              value={text}
              onChangeText={(v) => {
                setText(v);
                setError(undefined);
              }}
              onSubmitEditing={submit}
              error={error}
            />
            <Button title="Save price" loading={saving} onPress={submit} />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
