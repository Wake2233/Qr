import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { VehicleEditor } from '@/components/console/vehicle-editor';
import { Text } from '@/components/text';
import { useEditorDealers } from '@/lib/use-editor-dealers';

export default function NewVehicleScreen() {
  const { dealers, isAdmin, loading } = useEditorDealers();
  return (
    <>
      <Stack.Screen options={{ title: 'Add vehicle' }} />
      {loading ? (
        <ActivityIndicator className="mt-10" />
      ) : dealers.length === 0 ? (
        <View className="flex-1 bg-background p-6">
          <Text variant="muted">You need a dealership membership to add vehicles.</Text>
        </View>
      ) : (
        <VehicleEditor vehicle={null} dealers={dealers} isAdmin={isAdmin} />
      )}
    </>
  );
}
