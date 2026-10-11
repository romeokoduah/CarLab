/**
 * The pure pieces of the import helper: which links it will open, and the
 * functions it runs inside the che168 tab. Kept apart from background.js so the
 * site's unit tests can load them (lib/import/import-helper.test.ts).
 *
 * probeListing, scrollListingTo and collectListing are serialised by
 * chrome.scripting.executeScript and run in the che168 page, so they must not
 * reference anything outside their own bodies.
 */

/**
 * Text only a loaded listing shows: a label with a real value beside it. The
 * desktop page writes the value after the label (表显里程6.4万公里); the mobile
 * page writes it before (0.01万公里 / 表显里程), and shows the bare labels with
 * "-" for values while it is still loading, so a label alone is not enough.
 * Mirrors LISTING_MARKERS in lib/import/page-payload.ts.
 */
export const LISTING_MARKERS_SOURCE =
  "表显里程\\s*\\d|\\d\\s*万?公里\\s*表显里程|上牌时间\\s*\\d|\\d\\s*上牌时间|过户次数\\s*\\d|\\d\\s*次\\s*过户次数";

/**
 * The che168 listing link to open, or null when it isn't one.
 *
 * The English mirror (global.che168.com/en/detail/<id>) carries no Chinese
 * listing text and sits behind a verification page, so it is read from the
 * Chinese mobile page for the same car instead. Mirrors che168ReadUrl in
 * lib/import/che168-parse.ts.
 */
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
  const infoid = u.searchParams.get("infoid");
  if (u.hostname === "global.che168.com" || (u.hostname === "m.che168.com" && infoid)) {
    const id = /^\d{5,}$/.test(infoid || "") ? infoid : (u.pathname.match(/\d{5,}/g) || []).pop();
    return id ? `https://m.che168.com/cardetail/index?infoid=${id}` : null;
  }
  // Every other listing link carries the car's numeric id in its path.
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
      /Verifying the safety of the connection|正在验证连接安全性|Protected by Tencent Cloud EdgeOne/i.test(text),
    ready: new RegExp(markers).test(text),
    height: document.body ? document.body.scrollHeight : 0,
  };
}

export function scrollListingTo(y) {
  window.scrollTo(0, y);
}

/**
 * The page text and the listing's own gallery photos — the same selection the
 * server scrape reads. The desktop page's gallery is its 900x675 photos; the
 * mobile page's is the 1400x0 carousel, minus the clone slides the carousel
 * adds at each end to loop (the shop's other cars there are 640x480).
 */
export function collectListing() {
  const text = (document.body ? document.body.innerText : "").replace(/\n{2,}/g, "\n");
  const mobile = /^m\./.test(location.hostname);
  let imgs = [...document.querySelectorAll("img")];
  if (mobile) {
    const slides = [...document.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate) img")];
    if (slides.length) imgs = slides;
  }
  const size = mobile ? /1400x0_/ : /900x675/;
  const seen = new Set();
  const images = [];
  for (const im of imgs) {
    const candidates = [
      im.currentSrc,
      im.getAttribute("src"),
      im.getAttribute("data-src"),
      im.getAttribute("data-original"),
    ];
    for (let s of candidates) {
      if (!s || !/autoimg\.cn/.test(s) || !size.test(s)) continue;
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
