import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useRef } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { CameraView } from '@/lib/interop';
import { extractVin } from '@/lib/vin';
import { useScanStore } from '@/stores/scan';

/** VINs are printed as Code 39 on door jambs; windshield/registration labels may use other symbologies. */
const BARCODE_TYPES = ['code39', 'code128', 'datamatrix', 'qr', 'pdf417'] as const;

export default function ScanVinScreen() {
  const router = useRouter();
  const setVin = useScanStore((s) => s.setVin);
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  const onScan = ({ data }: BarcodeScanningResult) => {
    if (handled.current) return;
    const vin = extractVin(data);
    if (!vin) return;
    handled.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setVin(vin);
    router.back();
  };

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ title: 'Scan VIN', presentation: 'modal' }} />
      {!permission ? null : !permission.granted ? (
        <View className="flex-1 justify-center gap-4 bg-background px-6">
          <Text variant="title">Camera access needed</Text>
          <Text variant="muted">
            Allow camera access to scan the VIN barcode on the door jamb or windshield.
          </Text>
          <Button title="Allow camera" onPress={() => void requestPermission()} />
        </View>
      ) : (
        <>
          <CameraView
            className="flex-1"
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={onScan}
          />
          <View className="absolute inset-x-6 bottom-16 gap-2 rounded-lg bg-black/70 p-4">
            <Text className="text-center font-sans-semibold text-white">
              Point at the VIN barcode
            </Text>
            <Text className="text-center text-sm text-white/80">
              Driver-side door jamb or the base of the windshield
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
