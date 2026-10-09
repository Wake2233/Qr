import { CameraView } from 'expo-camera';
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Third-party views that should accept NativeWind `className`.
cssInterop(GestureHandlerRootView, { className: 'style' });
cssInterop(Image, { className: 'style' });
cssInterop(CameraView, { className: 'style' });

export { CameraView, GestureHandlerRootView, Image };
