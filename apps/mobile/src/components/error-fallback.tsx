import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from './button';
import { Text } from './text';

interface ErrorFallbackProps {
  error: Error;
  retry: () => Promise<void> | void;
}

/** Route error boundary UI (exported as `ErrorBoundary` from layouts). */
export function ErrorFallback({ error, retry }: ErrorFallbackProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View accessibilityRole="alert" className="flex-1 justify-center gap-4 px-6">
        <Text variant="display">Something went wrong</Text>
        <Text variant="muted">
          This screen failed to load. Try again — if it keeps happening, call or WhatsApp us.
        </Text>
        {__DEV__ ? <Text variant="caption">{error.message}</Text> : null}
        <Button title="Try again" onPress={() => void retry()} />
      </View>
    </SafeAreaView>
  );
}
