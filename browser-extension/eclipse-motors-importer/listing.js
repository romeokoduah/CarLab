/**
 * The pure pieces of the import helper: which links it will open, and the
 * functions it runs inside the che168 tab. Kept apart from background.js so the
 * site's unit tests can load them (lib/import/import-helper.test.ts).
 *
 * probeListing, scrollListingTo and collectListing are serialised by
 * chrome.scripting.executeScript and run in the che168 page, so they must not
 * reference anything outside their own bodies.
 */

/** Text only a loaded listing shows. Mirrors LISTING_MARKERS in lib/import/page-payload.ts. */
export const LISTING_MARKERS_SOURCE = "表显里程|上牌时间|过户次数";

/** The che168 listing link to open, or null when it isn't one. */
export function che168ListingUrl(raw) {
  let u;
  try {
    u = new URL(String(raw).trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (!/(^|\.)che168\.com$/.test(u.hostname)) return null;
  if (u.username || u.password || u.port) return null;
  // Every listing link carries the car's numeric id in its path.
  if (!/\d{5,}/.test(u.pathname)) return null;
  u.protocol = "https:";
  return u.toString();
}

export function probeListing(markers) {
  const text = document.body ? document.body.innerText : "";
  return {
    // che168's own captcha page, or the Tencent EdgeOne "check the box" page
    // it serves at the listing's own address.
    captcha:
      /captcha/i.test(location.pathname) ||
      /Verifying the safety of the connection|Protected by Tencent Cloud EdgeOne/i.test(text),
    ready: new RegExp(markers).test(text),
    height: document.body ? document.body.scrollHeight : 0,
  };
}

export function scrollListingTo(y) {
  window.scrollTo(0, y);
}

/** The page text and 900x675 gallery photos — the same selection the server scrape reads. */
export function collectListing() {
  const text = (document.body ? document.body.innerText : "").replace(/\n{2,}/g, "\n");
  const seen = new Set();
  const images = [];
  for (const im of document.querySelectorAll("img")) {
    const candidates = [
      im.currentSrc,
      im.getAttribute("src"),
      im.getAttribute("data-src"),
      im.getAttribute("data-original"),
    ];
    for (let s of candidates) {
      if (!s || !/autoimg\.cn/.test(s) || !/900x675/.test(s)) continue;
      if (s.startsWith("//")) s = "https:" + s;
      s = s.split("?")[0];
      if (!seen.has(s)) {
        seen.add(s);
        images.push(s);
      }
    }
  }
  return { title: document.title, text, images };
}
