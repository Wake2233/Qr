import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { cn } from '@/lib/cn';

/** 0–1 progress; the fill width is a Reanimated value (the one allowed inline style). */
export function ProgressBar({
  value,
  failed,
  label,
}: {
  value: number;
  failed?: boolean;
  label: string;
}) {
  const progress = useSharedValue(value);
  useEffect(() => {
    progress.value = withTiming(Math.min(1, Math.max(0, value)), { duration: 150 });
  }, [progress, value]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
    >
      <Animated.View className={cn('h-2', failed ? 'bg-destructive' : 'bg-primary')} style={fill} />
    </View>
  );
}
