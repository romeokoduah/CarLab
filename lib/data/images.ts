/**
 * A pool of reliable Unsplash car photographs used for the seed inventory.
 * In production these would be uploaded to Supabase Storage per car.
 * Each entry is an Unsplash photo id; we append sizing params at build time.
 */
const UNSPLASH_IDS: string[] = [
  "1503376780353-7e6692767b70",
  "1552519507-da3b142c6e3d",
  "1494976388531-d1058494cdd8",
  "1583121274602-3e2820c69888",
  "1549317661-bd32c8ce0db2",
  "1541899481282-d1eba8c53d0f",
  "1550355291-bbee04a92027",
  "1605559424843-9e4c228bf1c2",
  "1606664515524-ed2f786a0bd6",
  "1617469767053-d3b523a0b982",
  "1502877338535-766e1452684a",
  "1568605117036-5fe5e7bab0b7",
  "1580273916550-e323be2ae537",
  "1552519507-da3b142c6e3d",
  "1544636331-e26879cd4d9b",
  "1503736334956-4c8f8e92946d",
  "1511919884226-fd3cad34687c",
  "1561580125-028ee3bd62eb",
  "1542362567-b07e54358753",
  "1493238792000-8113da705763",
  "1600185365483-26d7a4cc7519",
  "1600712242805-5f78671b24da",
  "1614162692292-7ac56d7f7f1e",
  "1616422285623-13ff0162193c",
  "1618843479313-40f8afb4b4d8",
];

function url(id: string, w = 1600): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
}

/** Deterministically build a gallery of `count` images starting at `offset`. */
export function galleryFor(offset: number, count: number): { url: string; alt: string }[] {
  const out: { url: string; alt: string }[] = [];
  for (let i = 0; i < count; i++) {
    const id = UNSPLASH_IDS[(offset + i) % UNSPLASH_IDS.length];
    out.push({ url: url(id), alt: `Vehicle photograph ${i + 1}` });
  }
  return out;
}
