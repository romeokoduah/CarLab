import sharp from "sharp";

const TARGET_BYTES = 100 * 1024; // store every photo under 100 KB
const MAX_WIDTH = 1600;

/**
 * Shrink a photo to under ~100 KB.
 *
 * Phone photos are routinely 3–8 MB, which makes listings crawl on Ghanaian
 * mobile data. We re-encode to WebP and step quality down, then dimensions,
 * until the target is met — stopping at the first size that fits so we keep
 * as much quality as possible. `rotate()` honours EXIF so portrait shots
 * don't come out sideways.
 */
export async function compressToTarget(
  input: Buffer,
): Promise<{ buffer: Buffer; width: number; quality: number }> {
  for (const quality of [82, 72, 62, 52, 42]) {
    const buffer = await sharp(input)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    if (buffer.length <= TARGET_BYTES) {
      return { buffer, width: MAX_WIDTH, quality };
    }
  }

  for (const width of [1280, 1024, 800]) {
    const buffer = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 60 })
      .toBuffer();
    if (buffer.length <= TARGET_BYTES) return { buffer, width, quality: 60 };
  }

  // Best effort for extreme sources (very large, very detailed images).
  const buffer = await sharp(input)
    .rotate()
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 45 })
    .toBuffer();
  return { buffer, width: 800, quality: 45 };
}
