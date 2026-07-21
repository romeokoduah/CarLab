import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { compressToTarget } from "@/lib/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protected by middleware (/api/admin/:path*). Accepts one image per call.
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // accept big camera files… compressToTarget shrinks them under 100 KB

function uploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
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
