import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
}

const variants = {
  primary: { box: 'bg-primary', text: 'text-primary-foreground' },
  outline: { box: 'border border-border bg-transparent', text: 'text-foreground' },
  ghost: { box: 'bg-transparent', text: 'text-foreground' },
} as const;

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const style = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={(event) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(event);
      }}
      className={`h-12 flex-row items-center justify-center rounded-md px-5 active:opacity-80 ${style.box} ${disabled || loading ? 'opacity-50' : ''}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text className={`text-base font-semibold ${style.text}`}>{title}</Text>
      )}
    </Pressable>
  );
}
