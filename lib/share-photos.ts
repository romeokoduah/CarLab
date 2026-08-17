import { formatMileage, slugify } from "@/lib/utils";
import type { Car, CarImage } from "@/lib/types";

/** WhatsApp accepts a limited batch per share; ten is also all a buyer reads. */
export const MAX_SHARE_PHOTOS = 10;

/**
 * The photos worth sending for a car, cover first.
 *
 * Sorted by position rather than trusting array order, since a car edited in
 * the admin can come back from the store in whatever order the rows arrived.
 */
export function pickShareablePhotos(
  car: Car,
  max: number = MAX_SHARE_PHOTOS,
): CarImage[] {
  return car.images
    .filter((image) => image.url.trim().length > 0)
    .slice()
    .sort((a, b) => a.position - b.position)
    .slice(0, max);
}

interface CaptionOpts {
  car: Car;
  /** absolute listing URL, so it still works once forwarded on */
  listingUrl: string;
  /** already formatted, e.g. "GHS 685,000" */
  priceLabel: string;
}

/**
 * The message that rides along with the photos.
 *
 * Written to be forwarded straight to a buyer, so it reads as a dealer's own
 * note rather than an export from a system.
 */
export function buildPhotoCaption({
  car,
  listingUrl,
  priceLabel,
}: CaptionOpts): string {
  const specs = [priceLabel, formatMileage(car.mileageKm), car.colour.trim()]
    .filter(Boolean)
    .join(" · ");

  return [
    `${car.year} ${car.make} ${car.model}`,
    specs,
    listingUrl,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Names a downloaded/shared photo after its car, numbered from 1. */
export function photoFileName(car: Car, index: number): string {
  const slug = slugify(`${car.year} ${car.make} ${car.model}`);
  return `${slug}-${index + 1}.jpg`;
}

/**
 * Chat link used by the fallback: the photos are saved to the device, and
 * this opens the dealer's own chat with the caption already typed, ready for
 * those photos to be attached.
 */
export function buildPhotoFallbackLink(
  number: string,
  caption: string,
): string {
  const digits = number.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(caption)}`;
}

/** The slice of `navigator` this module needs — kept narrow so it can be faked. */
export interface ShareTarget {
  share?: (data: { files?: File[]; text?: string }) => Promise<void>;
  canShare?: (data: { files?: File[] }) => boolean;
}

/**
 * Whether this browser will really put image files on the share sheet.
 *
 * Desktop browsers commonly expose `share` while refusing file payloads, and
 * a `share()` call with unsupported files drops them silently — the photos
 * would simply never arrive. So anything short of an explicit yes falls back.
 */
export function canShareFiles(
  nav: ShareTarget | undefined,
  files: File[],
): boolean {
  if (!files.length) return false;
  if (typeof nav?.share !== "function") return false;
  if (typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files });
  } catch {
    return false;
  }
}

// ── Browser-only below. Everything decidable lives above, under test; these
// need a real canvas and network, and are kept as thin as possible.

/**
 * Fetch one upload and re-encode it as JPEG.
 *
 * Uploads are stored as WebP, which WhatsApp interprets as a sticker rather
 * than a photo — so the round-trip through a canvas is what makes a shared
 * image arrive as a picture.
 */
async function toJpegFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  const bitmap = await createImageBitmap(await res.blob());

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("Could not encode image");
  return new File([blob], name, { type: "image/jpeg" });
}

/**
 * That car's photos as shareable JPEG files, cover first.
 *
 * A photo that will not load is skipped rather than failing the whole share:
 * nine of ten photos is a good outcome, none is not.
 */
export async function collectCarPhotos(car: Car): Promise<File[]> {
  const picked = pickShareablePhotos(car);
  const files = await Promise.all(
    picked.map((image, i) =>
      toJpegFile(image.url, photoFileName(car, i)).catch(() => null),
    ),
  );
  return files.filter((f): f is File => f !== null);
}

/** Save files to the user's device — the fallback when file sharing is out. */
export function downloadFiles(files: File[]): void {
  for (const file of files) {
    const href = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = href;
    link.download = file.name;
    link.click();
    // Revoked on a later tick so the click has taken the URL first.
    setTimeout(() => URL.revokeObjectURL(href), 30_000);
  }
}
