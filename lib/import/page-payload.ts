/**
 * A che168 listing read in the admin's own browser, as the import route takes
 * it.
 *
 * che168 sends this server's traffic to its security check (`captcha.aspx`), so
 * the server often cannot open a listing itself. The Eclipse Motors import
 * helper (browser-extension/eclipse-motors-importer) reads the same two things
 * the server scrape reads — the page text and the gallery photo links — in the
 * admin's browser, and the admin page posts them here behind a prefix. They
 * then go through the same pipeline: DeepSeek, pricing, photos.
 *
 * Client-safe on purpose: the car form encodes the payload, so nothing
 * server-only may be imported here.
 */

export const PAGE_PAYLOAD_PREFIX = "EMIMPORT1:";

/** Text only a loaded listing shows: mileage, registration date, transfers. */
export const LISTING_MARKERS = /表显里程|上牌时间|过户次数/;

const MAX_TEXT = 300_000;
const MAX_IMAGES = 200;

export interface PagePayload {
  url: string;
  title: string;
  text: string;
  images: string[];
}

export class PagePayloadError extends Error {}

export function encodePagePayload(page: PagePayload): string {
  return PAGE_PAYLOAD_PREFIX + JSON.stringify({ v: 1, ...page });
}

/**
 * Validates a posted payload.
 *
 * The server downloads every photo link in it, so only che168's own image CDN
 * (autoimg.cn) is accepted, on the default port with no credentials — anything
 * looser would let a posted payload make the server fetch arbitrary addresses.
 */
export function decodePagePayload(raw: string): PagePayload {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(PAGE_PAYLOAD_PREFIX)) {
    throw new PagePayloadError("That isn't a listing read by the Eclipse Motors import helper.");
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed.slice(PAGE_PAYLOAD_PREFIX.length));
  } catch {
    throw new PagePayloadError("The listing read in your browser arrived cut off. Click Import to try again.");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new PagePayloadError("The listing read in your browser is not in the expected format.");
  }
  const d = data as Record<string, unknown>;

  const url = typeof d.url === "string" ? d.url : "";
  let host = "";
  try {
    const u = new URL(url);
    if (u.protocol === "https:" || u.protocol === "http:") host = u.hostname;
  } catch {
    // leave host empty
  }
  if (!/(^|\.)che168\.com$/.test(host)) {
    throw new PagePayloadError("That isn't a che168.com listing.");
  }

  const text = typeof d.text === "string" ? d.text : "";
  if (!text.trim()) {
    throw new PagePayloadError("The listing had no text. Click Import to try again.");
  }
  if (text.length > MAX_TEXT) {
    throw new PagePayloadError("That page is too large to be a single listing.");
  }

  const images: string[] = [];
  for (const candidate of Array.isArray(d.images) ? d.images : []) {
    if (typeof candidate !== "string") continue;
    let u: URL;
    try {
      u = new URL(candidate);
    } catch {
      continue;
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") continue;
    if (!/(^|\.)autoimg\.cn$/.test(u.hostname)) continue;
    if (u.port || u.username || u.password) continue;
    u.protocol = "https:";
    u.search = "";
    u.hash = "";
    const clean = u.toString();
    if (!images.includes(clean)) images.push(clean);
    if (images.length >= MAX_IMAGES) break;
  }

  return {
    url,
    title: typeof d.title === "string" ? d.title.slice(0, 200) : "",
    text,
    images,
  };
}
