/**
 * Generates placeholder photos for every `vehicle_images` row and uploads them through the
 * Storage API (local stack only). Real photography replaces these via the dashboard.
 */
import sharp from 'sharp';

import { localAdminClient } from './lib/local-supabase';

const palette: Record<string, [string, string]> = {
  'Alpine White': ['#e7e5e4', '#a8a29e'],
  'Jet Black': ['#27272a', '#09090b'],
  'Midnight Blue': ['#1e3a8a', '#0f172a'],
  'Lunar Silver': ['#d4d4d8', '#71717a'],
  'Graphite Gray': ['#52525b', '#18181b'],
  'Crimson Red': ['#b91c1c', '#450a0a'],
  'Pearl White': ['#fafaf9', '#d6d3d1'],
  'Forest Green': ['#166534', '#052e16'],
};

const xmlEntities: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
};
const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (c) => xmlEntities[c] ?? c);

function placeholderSvg(title: string, view: string, color: string) {
  const [from, to] = palette[color] ?? ['#3f3f46', '#09090b'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="1600" height="1067" fill="url(#g)"/>
  <rect y="760" width="1600" height="307" fill="#000" fill-opacity="0.35"/>
  <text x="80" y="880" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="#fff">${escapeXml(title)}</text>
  <text x="80" y="960" font-family="Helvetica, Arial, sans-serif" font-size="40" fill="#fff" fill-opacity="0.8">${escapeXml(view)} · placeholder photo</text>
</svg>`;
}

async function main() {
  const supabase = localAdminClient();
  const { data: images, error } = await supabase
    .from('vehicle_images')
    .select('storage_path, alt, vehicles(exterior_color)')
    .order('storage_path');
  if (error) throw error;

  let uploaded = 0;
  for (const image of images) {
    const [title = 'Vehicle', view = 'photo'] = (image.alt ?? '').split(' – ');
    const color = image.vehicles?.exterior_color ?? '';
    const jpeg = await sharp(Buffer.from(placeholderSvg(title, view, color)))
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    const { error: uploadError } = await supabase.storage
      .from('vehicle-images')
      .upload(image.storage_path, jpeg, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;
    uploaded += 1;
  }
  console.log(`✓ uploaded ${uploaded} placeholder photos to vehicle-images`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
