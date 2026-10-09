import { fitWithin, IMAGE_MAX_EDGE, IMAGE_QUALITY } from '@cp/core';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface PreparedPhoto {
  uri: string;
  width: number;
  height: number;
  contentType: 'image/webp' | 'image/jpeg';
  extension: 'webp' | 'jpg';
  blurhash: string | null;
}

/**
 * Resizes a picked/captured photo so the long edge is ≤ 2400px and re-encodes it
 * (WebP on native, JPEG on web where WebP encoding isn't guaranteed), then computes a blurhash.
 */
export async function preparePhoto(asset: {
  uri: string;
  width: number;
  height: number;
}): Promise<PreparedPhoto> {
  const target = fitWithin(asset.width, asset.height, IMAGE_MAX_EDGE);
  const webp = Platform.OS !== 'web';
  const context = ImageManipulator.manipulate(asset.uri);
  if (target.width !== asset.width || target.height !== asset.height) context.resize(target);
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    compress: IMAGE_QUALITY,
    format: webp ? SaveFormat.WEBP : SaveFormat.JPEG,
  });

  let blurhash: string | null = null;
  try {
    blurhash = await Image.generateBlurhashAsync(result.uri, [4, 3]);
  } catch {
    // Not available on every platform (e.g. web); the placeholder is optional.
  }

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    contentType: webp ? 'image/webp' : 'image/jpeg',
    extension: webp ? 'webp' : 'jpg',
    blurhash,
  };
}

/** PUTs a local file to a Supabase signed upload URL with progress (0–1). */
export async function uploadWithProgress(
  signedUrl: string,
  fileUri: string,
  contentType: string,
  publishableKey: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const body = await (await fetch(fileUri)).blob();
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('content-type', contentType);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('apikey', publishableKey);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'));
    xhr.send(body);
  });
}
