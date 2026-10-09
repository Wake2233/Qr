import { createPhotoUpload, useVehiclePhotos, type ConsoleVehicleImage } from '@cp/api';
import { MAX_VEHICLE_IMAGES, moveItem, parseDbError } from '@cp/core';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { toast } from 'sonner-native';

import { Button } from '@/components/button';
import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';
import { cn } from '@/lib/cn';
import { env } from '@/lib/env';
import { Image } from '@/lib/interop';
import { preparePhoto, uploadWithProgress } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import { uuid } from '@/lib/uuid';

interface PhotoManagerProps {
  vehicleId: string;
  dealerId: string;
  title: string;
  images: ConsoleVehicleImage[];
  error?: string;
}

interface UploadItem {
  key: string;
  progress: number;
  failed?: string;
}

/**
 * Library/camera multi-upload (resized + compressed on device) with per-photo progress.
 * Long-press a photo to select it, then move it, make it the cover, or delete it.
 */
export function PhotoManager({ vehicleId, dealerId, title, images, error }: PhotoManagerProps) {
  const photos = useVehiclePhotos(supabase, vehicleId);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const busy = photos.reorder.isPending || photos.remove.isPending;
  const room = MAX_VEHICLE_IMAGES - images.length;

  const setItem = (key: string, patch: Partial<UploadItem>) =>
    setUploads((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  async function upload(assets: ImagePicker.ImagePickerAsset[]) {
    const batch = assets.slice(0, room).map((asset) => ({ asset, key: uuid() }));
    if (assets.length > batch.length)
      toast.warning(`A listing can have at most ${MAX_VEHICLE_IMAGES} photos.`);
    if (batch.length === 0) return;
    setUploads((prev) => [...prev, ...batch.map(({ key }) => ({ key, progress: 0 }))]);

    const results = await Promise.all(
      batch.map(async ({ asset, key }) => {
        try {
          const photo = await preparePhoto(asset);
          const target = await createPhotoUpload(supabase, {
            dealerId,
            vehicleId,
            fileId: key,
            extension: photo.extension,
          });
          await uploadWithProgress(
            target.signedUrl,
            photo.uri,
            photo.contentType,
            env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
            (progress) => setItem(key, { progress }),
          );
          return {
            storage_path: target.path,
            width: photo.width,
            height: photo.height,
            blurhash: photo.blurhash,
          };
        } catch (uploadError) {
          setItem(key, {
            failed: uploadError instanceof Error ? uploadError.message : 'Upload failed',
          });
          return null;
        }
      }),
    );

    const uploaded = results.filter((r) => r !== null);
    if (uploaded.length) {
      try {
        await photos.add.mutateAsync(uploaded);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success(`${uploaded.length} photo${uploaded.length === 1 ? '' : 's'} added`);
      } catch (addError) {
        toast.error(parseDbError(addError).message);
      }
    }
    setUploads((prev) => prev.filter((u) => u.failed || !batch.some((b) => b.key === u.key)));
  }

  async function pick(source: 'library' | 'camera') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        `Allow ${source === 'camera' ? 'camera' : 'photo library'} access in Settings to add photos.`,
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 1,
      exif: false,
      ...(source === 'library'
        ? { allowsMultipleSelection: true, selectionLimit: room, orderedSelection: true }
        : {}),
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) await upload(result.assets);
  }

  const reorder = (from: number, to: number) => {
    const next = moveItem(images, from, to);
    photos.reorder.mutate(
      next.map((image) => image.id),
      { onError: (e) => toast.error(parseDbError(e).message) },
    );
  };

  const selectedIndex = images.findIndex((image) => image.id === selected);
  const selectedImage = images[selectedIndex];

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <Button
          title="Photo library"
          variant="outline"
          className="flex-1"
          disabled={room <= 0}
          onPress={() => void pick('library')}
        />
        <Button
          title="Camera"
          variant="outline"
          className="flex-1"
          disabled={room <= 0}
          onPress={() => void pick('camera')}
        />
      </View>
      <Text variant="caption">
        {images.length}/{MAX_VEHICLE_IMAGES} photos · resized to 2400px before upload · long-press
        to reorder
      </Text>
      {error ? (
        <Text variant="caption" className="text-destructive" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {uploads.map((item) => (
        <View
          key={item.key}
          className="flex-row items-center gap-3"
          accessibilityLiveRegion="polite"
        >
          {item.failed ? null : <ActivityIndicator />}
          <ProgressBar
            value={item.progress}
            failed={Boolean(item.failed)}
            label="Uploading photo"
          />
          <Text variant="caption" className={cn(item.failed && 'text-destructive')}>
            {item.failed ?? `${Math.round(item.progress * 100)}%`}
          </Text>
        </View>
      ))}

      <View className="flex-row flex-wrap gap-2">
        {images.map((image, index) => {
          const isSelected = image.id === selected;
          return (
            <Pressable
              key={image.id}
              accessibilityRole="button"
              accessibilityLabel={`${image.alt ?? `${title} photo ${index + 1}`}${index === 0 ? ', cover' : ''}`}
              accessibilityHint="Long-press to select and reorder"
              accessibilityState={{ selected: isSelected }}
              onLongPress={() => {
                void Haptics.selectionAsync();
                setSelected(isSelected ? null : image.id);
              }}
              onPress={() => selected && setSelected(isSelected ? null : image.id)}
              className={cn(
                'w-[31%] overflow-hidden rounded-md border-2',
                isSelected ? 'border-primary' : 'border-transparent',
              )}
            >
              <Image
                source={image.url}
                placeholder={image.blurhash ? { blurhash: image.blurhash } : undefined}
                cachePolicy="memory-disk"
                contentFit="cover"
                className="aspect-[4/3] w-full"
              />
              {index === 0 ? (
                <Text className="absolute left-1 top-1 overflow-hidden rounded-full bg-background/90 px-2 py-0.5 font-sans-medium text-xs">
                  Cover
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {selectedImage ? (
        <View className="flex-row flex-wrap gap-2 rounded-lg border border-border bg-muted/50 p-2">
          <Button
            size="sm"
            variant="ghost"
            title="◀ Earlier"
            disabled={busy || selectedIndex === 0}
            onPress={() => reorder(selectedIndex, selectedIndex - 1)}
          />
          <Button
            size="sm"
            variant="ghost"
            title="Later ▶"
            disabled={busy || selectedIndex === images.length - 1}
            onPress={() => reorder(selectedIndex, selectedIndex + 1)}
          />
          <Button
            size="sm"
            variant="ghost"
            title="Make cover"
            disabled={busy || selectedIndex === 0}
            onPress={() => reorder(selectedIndex, 0)}
          />
          <Button
            size="sm"
            variant="ghost"
            title="Delete"
            disabled={busy}
            onPress={() =>
              Alert.alert('Delete photo?', 'This removes it from the listing.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () =>
                    photos.remove.mutate(
                      { id: selectedImage.id, storage_path: selectedImage.storage_path },
                      {
                        onSuccess: () => setSelected(null),
                        onError: (e) => toast.error(parseDbError(e).message),
                      },
                    ),
                },
              ])
            }
          />
        </View>
      ) : null}
    </View>
  );
}
