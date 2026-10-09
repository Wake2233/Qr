import { CameraView } from 'expo-camera';
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

// Third-party views that should accept NativeWind `className`.
cssInterop(GestureHandlerRootView, { className: 'style' });
cssInterop(Image, { className: 'style' });
cssInterop(CameraView, { className: 'style' });
// Reanimated views: className styles merge with the animated `style`.
cssInterop(Animated.View, { className: 'style' });

export { CameraView, GestureHandlerRootView, Image };
