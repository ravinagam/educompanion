import sharp from 'sharp';

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

const EXT_TO_MEDIA: Record<string, ImageMediaType> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
};

// Anthropic API limit is 5MB base64 (~3.75MB raw). Stay safely under with 3.5MB.
const MAX_RAW_BYTES = 3.5 * 1024 * 1024;

export async function compressForApi(
  buffer: Buffer,
  storagePath: string
): Promise<{ base64: string; mediaType: ImageMediaType }> {
  const ext = storagePath.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mediaType = EXT_TO_MEDIA[ext] ?? 'image/jpeg';

  if (buffer.length <= MAX_RAW_BYTES) {
    return { base64: buffer.toString('base64'), mediaType };
  }

  console.log(`[compress] ${storagePath}: ${Math.round(buffer.length / 1024)}KB exceeds limit, resizing`);
  const compressed = await sharp(buffer)
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  console.log(`[compress] → ${Math.round(compressed.length / 1024)}KB`);

  return { base64: compressed.toString('base64'), mediaType: 'image/jpeg' };
}
