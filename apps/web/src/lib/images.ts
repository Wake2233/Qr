'use client';

import { fitWithin, IMAGE_MAX_EDGE, IMAGE_QUALITY } from '@cp/core';
import { encode } from 'blurhash';

export interface PreparedImage {
  blob: Blob;
  contentType: 'image/webp' | 'image/jpeg';
  extension: 'webp' | 'jpg';
  width: number;
  height: number;
  blurhash: string | null;
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, IMAGE_QUALITY));

/**
 * Resizes a photo so its long edge is ≤ 2400px, re-encodes it as WebP (JPEG where the browser
 * can't encode WebP, e.g. Safari) and computes a blurhash placeholder. EXIF orientation is
 * applied by createImageBitmap.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, IMAGE_MAX_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available');
    context.drawImage(bitmap, 0, 0, width, height);

    let blob = await toBlob(canvas, 'image/webp');
    let contentType: PreparedImage['contentType'] = 'image/webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await toBlob(canvas, 'image/jpeg');
      contentType = 'image/jpeg';
    }
    if (!blob) throw new Error('Could not encode the image');

    return {
      blob,
      contentType,
      extension: contentType === 'image/webp' ? 'webp' : 'jpg',
      width,
      height,
      blurhash: blurhashOf(bitmap),
    };
  } finally {
    bitmap.close();
  }
}

function blurhashOf(bitmap: ImageBitmap): string | null {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, size, size);
  const { data } = context.getImageData(0, 0, size, size);
  return encode(data, size, size, 4, 3);
}

/** PUTs a file to a Supabase signed upload URL, reporting progress (0–1). */
export function uploadWithProgress(
  signedUrl: string,
  body: Blob,
  contentType: string,
  publishableKey: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
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
