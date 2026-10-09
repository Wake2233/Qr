import { vehicleImageAlt } from '@cp/core';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StatusBar,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { GestureHandlerRootView, Image } from '@/lib/interop';

import { ZoomableImage } from './zoomable-image';

export interface GalleryImage {
  id: string;
  url: string;
  blurhash: string | null;
  alt: string | null;
}

/** Swipeable photo pager; tap opens a full-screen viewer with pinch-zoom. */
export function VehicleGallery({ title, images }: { title: string; images: GalleryImage[] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const label = (image: GalleryImage, i: number) => image.alt ?? vehicleImageAlt(title, null, i);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) =>
      setIndex(Math.round(event.nativeEvent.contentOffset.x / width)),
    [width],
  );

  if (images.length === 0) {
    return (
      <View className="aspect-[4/3] w-full items-center justify-center bg-muted">
        <Icon name="car" size={40} tone="muted" />
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(image) => image.id}
        onMomentumScrollEnd={onScroll}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => (
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={`${label(item, i)}. Photo ${i + 1} of ${images.length}. Opens full screen.`}
            onPress={() => setViewerAt(i)}
          >
            <Image
              source={{ uri: item.url }}
              placeholder={item.blurhash ? { blurhash: item.blurhash } : undefined}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
              priority={i === 0 ? 'high' : 'normal'}
              className="aspect-[4/3] w-screen bg-muted"
            />
          </Pressable>
        )}
      />
      <View className="absolute bottom-3 right-3 flex-row items-center gap-2 rounded-full bg-background/85 px-3 py-1">
        <Text className="font-sans-medium text-xs">
          {index + 1} / {images.length}
        </Text>
        <Icon name="expand" size={12} />
      </View>

      <PhotoViewer
        images={images}
        startAt={viewerAt}
        label={label}
        onClose={(last) => {
          setViewerAt(null);
          setIndex(last);
        }}
      />
    </View>
  );
}

function PhotoViewer({
  images,
  startAt,
  label,
  onClose,
}: {
  images: GalleryImage[];
  startAt: number | null;
  label: (image: GalleryImage, i: number) => string;
  onClose: (lastIndex: number) => void;
}) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(startAt ?? 0);
  const [zoomed, setZoomed] = useState(false);
  const [openedAt, setOpenedAt] = useState(startAt);
  if (startAt !== openedAt) {
    setOpenedAt(startAt);
    if (startAt !== null) setIndex(startAt);
  }

  return (
    <Modal
      visible={startAt !== null}
      animationType="fade"
      presentationStyle="fullScreen"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={() => onClose(index)}
    >
      <StatusBar hidden />
      {/* Modals render outside the root view, so gestures need their own root. */}
      <GestureHandlerRootView className="flex-1 bg-black">
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          initialScrollIndex={startAt ?? 0}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(image) => image.id}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index: i }) => (
            <View className="h-screen w-screen">
              <ZoomableImage
                uri={item.url}
                blurhash={item.blurhash}
                label={label(item, i)}
                zoomed={zoomed && i === index}
                onZoomChange={setZoomed}
              />
            </View>
          )}
        />
        {/* SafeAreaView sets padding from the insets, so spacing goes on an inner view. */}
        <SafeAreaView edges={['top']} className="absolute inset-x-0 top-0">
          <View className="flex-row items-center justify-between px-4 py-2">
            <Text className="font-sans-medium text-sm text-white">
              {index + 1} / {images.length}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close photos"
              onPress={() => onClose(index)}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/15"
            >
              <Text className="font-sans-semibold text-lg text-white">✕</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}
