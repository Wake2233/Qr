import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import { cn } from '@/lib/cn';

/** A small one-of-N switch (≥44pt touch targets), e.g. Light / Dark. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            className={cn(
              'min-h-11 flex-1 items-center justify-center rounded-full border px-4',
              selected ? 'border-foreground bg-foreground' : 'border-border bg-background',
            )}
          >
            <Text
              className={cn(
                'font-sans-medium text-sm',
                selected ? 'text-background' : 'text-foreground',
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
