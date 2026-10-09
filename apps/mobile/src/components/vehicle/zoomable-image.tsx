import { useMemo } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Image } from '@/lib/interop';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * Pinch-to-zoom, pan while zoomed, double-tap to toggle zoom. Panning only engages while
 * zoomed, so the pager underneath keeps its swipe (`onZoomChange` disables it while zoomed).
 */
export function ZoomableImage({
  uri,
  blurhash,
  label,
  zoomed,
  onZoomChange,
}: {
  uri: string;
  blurhash: string | null;
  label: string;
  zoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const gesture = useMemo(() => {
    const reset = () => {
      'worklet';
      scale.set(withTiming(1));
      savedScale.set(1);
      x.set(withTiming(0));
      y.set(withTiming(0));
      savedX.set(0);
      savedY.set(0);
      scheduleOnRN(onZoomChange, false);
    };
    const pinch = Gesture.Pinch()
      .onUpdate((e) => {
        scale.set(Math.min(Math.max(savedScale.get() * e.scale, 1), MAX_SCALE));
      })
      .onEnd(() => {
        if (scale.get() <= 1.02) {
          reset();
          return;
        }
        savedScale.set(scale.get());
        scheduleOnRN(onZoomChange, true);
      });
    const pan = Gesture.Pan()
      .enabled(zoomed)
      .onUpdate((e) => {
        x.set(savedX.get() + e.translationX);
        y.set(savedY.get() + e.translationY);
      })
      .onEnd(() => {
        savedX.set(x.get());
        savedY.set(y.get());
      });
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        if (savedScale.get() > 1) {
          reset();
        } else {
          scale.set(withTiming(DOUBLE_TAP_SCALE));
          savedScale.set(DOUBLE_TAP_SCALE);
          scheduleOnRN(onZoomChange, true);
        }
      });
    return Gesture.Simultaneous(pinch, pan, doubleTap);
  }, [zoomed, onZoomChange, scale, savedScale, x, y, savedX, savedY]);

  // Reanimated values are the one allowed inline style (CLAUDE.md).
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View className="flex-1" style={animatedStyle}>
        <Image
          source={{ uri }}
          placeholder={blurhash ? { blurhash } : undefined}
          contentFit="contain"
          cachePolicy="memory-disk"
          accessibilityLabel={label}
          accessibilityHint="Pinch or double-tap to zoom"
          className="h-full w-full"
        />
      </Animated.View>
    </GestureDetector>
  );
}
