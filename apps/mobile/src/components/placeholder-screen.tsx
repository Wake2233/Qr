import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PriceTag } from './price-tag';

interface PlaceholderScreenProps {
  title: string;
  description: string;
}

/** Phase 1 shell screen: proves design tokens and workspace imports render. */
export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-1 gap-4 px-4 pt-6">
        <Text className="text-3xl font-bold text-foreground">{title}</Text>
        <Text className="text-base text-muted-foreground">{description}</Text>
        <View className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-4">
          <View className="rounded-md bg-primary px-3 py-1.5">
            <Text className="text-sm font-semibold text-primary-foreground">Featured</Text>
          </View>
          <PriceTag cents={4_599_000} />
        </View>
      </View>
    </SafeAreaView>
  );
}
