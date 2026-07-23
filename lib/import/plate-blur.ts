/**
 * Automatic number-plate blurring, run on every stored car photo.
 *
 * A small YOLOv8 licence-plate detector (MIT-licensed, ~12 MB ONNX) runs
 * locally through onnxruntime-node — no photo ever leaves the server. Any
 * plate it finds, front or back and including plates on cars in the
 * background, is blurred with sharp before the photo is compressed and saved.
 *
 * It is deliberately precision-biased: a wide-rectangle + confidence filter
 * drops the squarish false positives that would otherwise blur a seat or a
 * wheel, because a censored-looking interior shot hurts a listing worse than
 * an occasional missed plate the admin can catch by re-uploading.
 *
 * Fail-open by design: if the model file is missing or inference throws, the
 * original photo passes through unchanged rather than blocking an upload. The
 * detection is validated against real che168 photos in
 * scripts/validate-plate-blur (see repo history).
 */
import path from "node:path";
import { access } from "node:fs/promises";
import sharp, { type OverlayOptions } from "sharp";
import type { InferenceSession, Tensor } from "onnxruntime-node";

const SIZE = 640;
const IOU = 0.45;
// Aspect (width/height) sanity bounds. The low bound is deliberately below 1
// so a plate seen at a steep angle — whose axis-aligned box goes nearly
// square — is still allowed through.
const MIN_ASPECT = 0.7;
const MAX_ASPECT = 9;
// Confidence gating, graded by shape. A plate photographed head-on is a wide
// rectangle and safe to accept at moderate confidence. A plate on a *tilted*
// car foreshortens into a squarish box — indistinguishable by shape alone
// from a false positive (a seat panel, a wheel), so we only accept a squarish
// box when the model is highly confident it is a plate. This catches angled
// plates the old flat "must be wide" rule dropped, without re-admitting the
// interior false positives that rule was there to reject.
const WIDE_CONF = 0.5; // wide (aspect ≥ WIDE_ASPECT) plates
const SQUARE_CONF = 0.6; // squarish/angled plates need more confidence
const WIDE_ASPECT = 1.6;

function modelPath(): string {
  return (
    process.env.PLATE_MODEL_PATH ||
    path.join(process.cwd(), "models", "plate.onnx")
  );
}

let sessionPromise: Promise<InferenceSession | null> | null = null;
let warned = false;

/** Load the ONNX model once. Returns null (and warns once) if unavailable. */
async function getSession(): Promise<InferenceSession | null> {
  if (process.env.PLATE_BLUR_DISABLED === "1") return null;
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const file = modelPath();
      try {
        await access(file);
        const ort = await import("onnxruntime-node");
        return await ort.InferenceSession.create(file);
      } catch (e) {
        if (!warned) {
          warned = true;
          console.warn(
            `plate-blur: model not loaded (${file}) — photos will not be blurred:`,
            e instanceof Error ? e.message : e,
          );
        }
        return null;
      }
    })();
  }
  return sessionPromise;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
}

function iou(a: Box, b: Box): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / (a.w * a.h + b.w * b.h - inter);
}

function nms(dets: Box[]): Box[] {
  dets.sort((p, q) => q.score - p.score);
  const keep: Box[] = [];
  for (const d of dets) {
    if (keep.every((k) => iou(k, d) < IOU)) keep.push(d);
  }
  return keep;
}

/**
 * Blur every licence plate in a photo. Returns a new buffer, or the original
 * unchanged if the model is unavailable or nothing is detected.
 */
export async function blurPlates(input: Buffer): Promise<Buffer> {
  const session = await getSession();
  if (!session) return input;

  try {
    const meta = await sharp(input).metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    if (!W || !H) return input;

    // Letterbox to SIZE×SIZE (grey pad), the layout YOLOv8 was trained on.
    const scale = Math.min(SIZE / W, SIZE / H);
    const nw = Math.round(W * scale);
    const nh = Math.round(H * scale);
    const padX = Math.floor((SIZE - nw) / 2);
    const padY = Math.floor((SIZE - nh) / 2);
    const resized = await sharp(input)
      .resize(nw, nh)
      .extend({
        top: padY,
        bottom: SIZE - nh - padY,
        left: padX,
        right: SIZE - nw - padX,
        background: { r: 114, g: 114, b: 114 },
      })
      .removeAlpha()
      .raw()
      .toBuffer();

    const plane = SIZE * SIZE;
    const chw = new Float32Array(3 * plane);
    for (let i = 0; i < plane; i++) {
      chw[i] = resized[i * 3] / 255;
      chw[plane + i] = resized[i * 3 + 1] / 255;
      chw[2 * plane + i] = resized[i * 3 + 2] / 255;
    }

    const ort = await import("onnxruntime-node");
    const tensor: Tensor = new ort.Tensor("float32", chw, [1, 3, SIZE, SIZE]);
    const output = await session.run({ [session.inputNames[0]]: tensor });
    const o = output[session.outputNames[0]];
    const n = o.dims[2]; // [1, 5, 8400]
    const data = o.data as Float32Array;

    const dets: Box[] = [];
    for (let i = 0; i < n; i++) {
      const score = data[4 * n + i];
      if (score < WIDE_CONF) continue;
      const cw = data[2 * n + i];
      const ch = data[3 * n + i];
      const aspect = cw / ch;
      if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) continue;
      // A squarish box is only a plate if the model is very sure — otherwise
      // it is a foreshortened angled plate we still want, or a false positive
      // we do not. Confidence is what separates the two.
      if (aspect < WIDE_ASPECT && score < SQUARE_CONF) continue;
      const cx = data[i];
      const cy = data[n + i];
      dets.push({
        x: (cx - cw / 2 - padX) / scale,
        y: (cy - ch / 2 - padY) / scale,
        w: cw / scale,
        h: ch / scale,
        score,
      });
    }

    const boxes = nms(dets);
    if (!boxes.length) return input;

    const composites: OverlayOptions[] = [];
    for (const b of boxes) {
      const pad = Math.round(b.h * 0.15);
      const x = Math.max(0, Math.round(b.x - pad));
      const y = Math.max(0, Math.round(b.y - pad));
      const w = Math.min(W - x, Math.round(b.w + pad * 2));
      const h = Math.min(H - y, Math.round(b.h + pad * 2));
      if (w < 4 || h < 4) continue;
      const region = await sharp(input)
        .extract({ left: x, top: y, width: w, height: h })
        .blur(Math.max(6, Math.min(w, h) / 3))
        .toBuffer();
      composites.push({ input: region, left: x, top: y });
    }
    if (!composites.length) return input;

    return await sharp(input).composite(composites).toBuffer();
  } catch (e) {
    console.warn(
      "plate-blur: detection failed, leaving photo unblurred:",
      e instanceof Error ? e.message : e,
    );
    return input;
  }
}
