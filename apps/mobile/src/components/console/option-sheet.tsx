import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { cn } from '@/lib/cn';

export interface Option<T extends string | number> {
  value: T;
  label: string;
}

/** Full-screen picker with search (long lists like makes/models/years). */
export function OptionSheet<T extends string | number>({
  visible,
  title,
  options,
  value,
  allowNone,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: readonly Option<T>[];
  value: T | null | undefined;
  allowNone?: boolean;
  onSelect: (value: T | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const rows: (Option<T> | { value: null; label: string })[] = allowNone
    ? [{ value: null, label: 'Not set' }, ...filtered]
    : [...filtered];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Text variant="title">{title}</Text>
          <Text
            accessibilityRole="button"
            onPress={onClose}
            className="px-2 py-2 font-sans-medium text-primary"
          >
            Done
          </Text>
        </View>
        {options.length > 12 ? (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor="#71717a"
            accessibilityLabel={`Search ${title}`}
            autoCorrect={false}
            className="mx-4 my-3 h-11 rounded-md border border-input px-3 font-sans text-base text-foreground"
          />
        ) : null}
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.value)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = item.value === (value ?? null);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  onSelect(item.value);
                  setQuery('');
                  onClose();
                }}
                className="min-h-12 flex-row items-center justify-between border-b border-border px-4 active:bg-muted"
              >
                <Text className={cn(selected && 'font-sans-semibold text-primary')}>
                  {item.label}
                </Text>
                {selected ? <Text className="text-primary">✓</Text> : null}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
