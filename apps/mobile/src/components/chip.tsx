import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

import { Text } from '@/components/text';
import { cn } from '@/lib/cn';

/** Toggle chip for buyer filters (≥44pt touch target). */
export function Chip({
  label,
  count,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={
        accessibilityLabel ?? (count === undefined ? label : `${label}, ${count}`)
      }
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      className={cn(
        'min-h-11 flex-row items-center gap-1.5 rounded-full border px-4',
        selected ? 'border-foreground bg-foreground' : 'border-border bg-background',
      )}
    >
      <Text
        className={cn('font-sans-medium text-sm', selected ? 'text-background' : 'text-foreground')}
      >
        {label}
      </Text>
      {count !== undefined ? (
        <Text className={cn('text-xs', selected ? 'text-background/70' : 'text-muted-foreground')}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}
