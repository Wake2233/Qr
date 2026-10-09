import { useConsoleVehicle } from '@cp/api';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { VehicleEditor } from '@/components/console/vehicle-editor';
import { Text } from '@/components/text';
import { supabase } from '@/lib/supabase';
import { useEditorDealers } from '@/lib/use-editor-dealers';

export default function EditVehicleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicle = useConsoleVehicle(supabase, id ?? null);
  const { dealers, isAdmin, loading } = useEditorDealers();
  // Live listings are readable by everyone; only the owning dealer's members (or admins) may edit.
  const data = vehicle.data;

  if (vehicle.isPending || loading) return <ActivityIndicator className="mt-10" />;
  if (!data || !(isAdmin || dealers.some((d) => d.id === data.dealer_id))) {
    return (
      <View className="flex-1 bg-background p-6">
        <Stack.Screen options={{ title: 'Not found' }} />
        <Text variant="muted">This listing doesn&apos;t exist or isn&apos;t yours to edit.</Text>
      </View>
    );
  }
  const options = dealers.some((d) => d.id === data.dealer_id)
    ? dealers
    : [
        { id: data.dealer.id, name: data.dealer.display_name, status: data.dealer.status },
        ...dealers,
      ];
  return (
    <>
      <Stack.Screen options={{ title: data.title }} />
      <VehicleEditor key={data.updated_at} vehicle={data} dealers={options} isAdmin={isAdmin} />
    </>
  );
}
