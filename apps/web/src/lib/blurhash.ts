import { decode } from 'blurhash';

const cache = new Map<string, string | undefined>();
const MAX_CACHE = 500;

/**
 * Blurhash → tiny BMP data URL for `next/image` `blurDataURL`. BMP needs no compression or
 * canvas, so the same code runs during SSR and for client-fetched grid pages; Next applies
 * the blur when it scales the 8×6 image up. Returns undefined for a missing/invalid hash.
 */
export function blurhashDataUrl(
  hash: string | null | undefined,
  width = 8,
  height = 6,
): string | undefined {
  if (!hash) return undefined;
  const key = `${hash}:${width}x${height}`;
  if (cache.has(key)) return cache.get(key);

  let url: string | undefined;
  try {
    url = encodeBmp(decode(hash, width, height), width, height);
  } catch {
    url = undefined;
  }
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(key, url);
  return url;
}

function encodeBmp(rgba: Uint8ClampedArray, width: number, height: number): string {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const dataSize = rowSize * height;
  const bytes = new Uint8Array(54 + dataSize);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x42; // "B"
  bytes[1] = 0x4d; // "M"
  view.setUint32(2, bytes.length, true);
  view.setUint32(10, 54, true); // pixel data offset
  view.setUint32(14, 40, true); // BITMAPINFOHEADER
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // positive = rows stored bottom-up
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, 24, true); // bits per pixel (BGR)
  view.setUint32(34, dataSize, true);

  for (let y = 0; y < height; y++) {
    const sourceRow = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const i = (sourceRow * width + x) * 4;
      const o = 54 + y * rowSize + x * 3;
      bytes[o] = rgba[i + 2] ?? 0;
      bytes[o + 1] = rgba[i + 1] ?? 0;
      bytes[o + 2] = rgba[i] ?? 0;
    }
  }

  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/bmp;base64,${btoa(binary)}`;
}
