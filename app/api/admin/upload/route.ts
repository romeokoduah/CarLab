import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protected by middleware (/api/admin/:path*). Accepts one image per call.
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // accept big camera files…
const TARGET_BYTES = 100 * 1024; // …but store them under 100 KB
const MAX_WIDTH = 1600;

function uploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}

/**
 * Shrink a photo to under ~100 KB.
 *
 * Phone photos are routinely 3–8 MB, which makes listings crawl on Ghanaian
 * mobile data. We re-encode to WebP and step quality down, then dimensions,
 * until the target is met — stopping at the first size that fits so we keep
 * as much quality as possible. `rotate()` honours EXIF so portrait shots
 * don't come out sideways.
 */
async function compressToTarget(
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

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG or WebP." },
      { status: 415 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 25 MB)." },
      { status: 413 },
    );
  }

  const original = Buffer.from(await file.arrayBuffer());

  let compressed: Buffer;
  try {
    compressed = (await compressToTarget(original)).buffer;
  } catch {
    return NextResponse.json(
      { error: "Could not process that image." },
      { status: 422 },
    );
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.webp`;
  await writeFile(path.join(dir, name), compressed);

  return NextResponse.json({
    url: `/uploads/${name}`,
    bytes: compressed.length,
    originalBytes: original.length,
  });
}
