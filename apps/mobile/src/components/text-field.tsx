import { forwardRef } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/text';
import { cn } from '@/lib/cn';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, required, className, ...props },
  ref,
) {
  return (
    <View className="gap-2">
      <Text variant="label">
        {label}
        {required ? <Text variant="caption"> (required to publish)</Text> : null}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor="#71717a"
        className={cn(
          'h-12 rounded-md border px-3 font-sans text-base text-foreground',
          error ? 'border-destructive' : 'border-input',
          className,
        )}
        {...props}
      />
      {error ? (
        <Text variant="caption" className="text-destructive">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
});
