import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { cn } from '@/lib/cn';

export interface SheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hint?: string;
}

/** Bottom action list (works the same on iOS, Android and web). */
export function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close"
        onPress={onClose}
        className="flex-1 justify-end bg-black/50"
      >
        <Pressable onPress={() => {}} className="rounded-t-2xl bg-card">
          <SafeAreaView edges={['bottom']} className="gap-1 px-2 pb-2 pt-4">
            <Text variant="caption" className="px-4 pb-2">
              {title}
            </Text>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityState={{ disabled: Boolean(action.disabled) }}
                disabled={action.disabled}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
                className={cn(
                  'min-h-12 justify-center rounded-lg px-4 active:bg-muted',
                  action.disabled && 'opacity-50',
                )}
              >
                <Text className={cn(action.destructive && 'text-destructive')}>{action.label}</Text>
                {action.hint ? <Text variant="caption">{action.hint}</Text> : null}
              </Pressable>
            ))}
            <View className="h-px bg-border" />
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="min-h-12 justify-center rounded-lg px-4 active:bg-muted"
            >
              <Text className="font-sans-semibold">Cancel</Text>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
