import { describe, expect, it } from 'vitest';

import { blurhashDataUrl } from './blurhash';

const HASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

function bytesOf(url: string) {
  return Uint8Array.from(atob(url.split(',')[1] ?? ''), (c) => c.charCodeAt(0));
}

describe('blurhashDataUrl', () => {
  it('encodes a valid hash as a BMP data URL', () => {
    const url = blurhashDataUrl(HASH);
    expect(url).toMatch(/^data:image\/bmp;base64,/);
    const bytes = bytesOf(url ?? '');
    expect(String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0)).toBe('BM');
    // 54-byte header + 6 rows of 24 bytes (8 px × 3, already 4-byte aligned)
    expect(bytes.length).toBe(54 + 6 * 24);
  });

  it('pads rows to 4 bytes for odd widths', () => {
    expect(bytesOf(blurhashDataUrl(HASH, 5, 3) ?? '').length).toBe(54 + 3 * 16);
  });

  it('returns the same string for repeated calls (memoized)', () => {
    expect(blurhashDataUrl(HASH)).toBe(blurhashDataUrl(HASH));
  });

  it.each([[null], [undefined], [''], ['not-a-blurhash']])('%j → undefined', (hash) => {
    expect(blurhashDataUrl(hash)).toBeUndefined();
  });
});
