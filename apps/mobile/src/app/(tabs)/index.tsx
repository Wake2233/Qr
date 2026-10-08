import { useFacets, useSiteSettings } from '@cp/api';
import { Link } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { supabase } from '@/lib/supabase';

export default function DiscoverScreen() {
  const facets = useFacets(supabase, {});
  const settings = useSiteSettings(supabase);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-6 px-4 pb-10 pt-6">
        <Text className="font-sans-medium text-sm uppercase tracking-widest text-primary">
          {facets.data
            ? `${facets.data.total} vehicles in stock`
            : (settings.data?.brand_name ?? ' ')}
        </Text>
        <Text className="font-display-bold text-4xl leading-tight text-foreground">
          Find the car you&apos;ll love driving.
        </Text>
        <Text variant="muted">
          Exact prices and full specs on every listing. Found the one? Message us on WhatsApp or
          call — no checkout, no runaround.
        </Text>
        <View className="gap-3">
          <Link href="/search" asChild>
            <Button title="Browse inventory" />
          </Link>
          <Link href="/finance" asChild>
            <Button title="Get pre-qualified" variant="outline" />
          </Link>
        </View>
        {facets.isError ? (
          <Text variant="caption">Inventory is unavailable right now. Pull to retry later.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
