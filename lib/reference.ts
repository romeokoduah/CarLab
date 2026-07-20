import { randomInt } from "node:crypto";

/**
 * Customer tracking references, formatted `XXXX-XXXX`.
 *
 * The alphabet deliberately omits 0/O and 1/I/L: customers read these codes
 * aloud over the phone and WhatsApp, and look-alike characters are the main
 * source of transcription errors.
 */
export const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateReference(): string {
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

/**
 * Forgiving parse of whatever the customer types. Handles lowercase, stray
 * spaces, a missing or exotic dash. Returns the canonical form, or null when
 * it can't be a valid reference.
 */
export function normalizeReference(input: string): string | null {
  if (!input) return null;
  const cleaned = input
    .toUpperCase()
    .replace(/[\s\-–—_]/g, "")
    .trim();
  if (cleaned.length !== 8) return null;
  for (const ch of cleaned) {
    if (!REFERENCE_ALPHABET.includes(ch)) return null;
  }
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}
