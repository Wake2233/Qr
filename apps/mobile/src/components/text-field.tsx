import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, className, ...props },
  ref,
) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor="#71717a"
        className={`h-12 rounded-md border px-3 text-base text-foreground ${error ? 'border-destructive' : 'border-input'} ${className ?? ''}`}
        {...props}
      />
      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
    </View>
  );
});
