import { cssInterop } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Third-party views that should accept NativeWind `className`.
cssInterop(GestureHandlerRootView, { className: 'style' });

export { GestureHandlerRootView };
