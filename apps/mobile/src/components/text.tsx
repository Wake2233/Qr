import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/lib/cn';

const variants = {
  display: 'font-display-bold text-3xl text-foreground',
  title: 'font-display text-xl text-foreground',
  heading: 'font-sans-semibold text-base text-foreground',
  body: 'font-sans text-base text-foreground',
  muted: 'font-sans text-base text-muted-foreground',
  caption: 'font-sans text-sm text-muted-foreground',
  label: 'font-sans-medium text-sm text-foreground',
} as const;

export type TextVariant = keyof typeof variants;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  className?: string;
}

/**
 * Typography primitive: brand fonts per weight (RN Text doesn't inherit fonts from parents).
 * `className` overrides the variant (merged with `cn`).
 */
export function Text({ variant = 'body', className, ...props }: TextProps) {
  return <RNText className={cn(variants[variant], className)} {...props} />;
}
