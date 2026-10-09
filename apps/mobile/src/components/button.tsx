import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { Text } from '@/components/text';
import { cn } from '@/lib/cn';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive';
  size?: 'md' | 'sm';
  loading?: boolean;
  className?: string;
}

const variants = {
  primary: { box: 'bg-primary', text: 'text-primary-foreground' },
  outline: { box: 'border border-border bg-transparent', text: 'text-foreground' },
  ghost: { box: 'bg-transparent', text: 'text-foreground' },
  destructive: { box: 'bg-destructive', text: 'text-destructive-foreground' },
} as const;

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  onPress,
  className,
  ...props
}: ButtonProps) {
  const style = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={(event) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(event);
      }}
      className={cn(
        'flex-row items-center justify-center rounded-md active:opacity-80',
        size === 'md' ? 'h-12 px-5' : 'h-11 px-4',
        style.box,
        (disabled || loading) && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text
          className={cn('font-sans-semibold', size === 'md' ? 'text-base' : 'text-sm', style.text)}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
