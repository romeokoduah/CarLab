/**
 * Server-side scraper for a che168.com listing.
 *
 * The Chinese dealer page (the link the admin pastes) is the source of truth:
 * it carries the RMB asking price, mileage, registration date, transfer count,
 * every photo, and the dealer's highlight tags — for every car, including ones
 * whose English mirror has been taken down or marked sold. The English mirror
 * (`global.che168.com/en/detail/<id>`) is read opportunistically for cleaner
 * English specs and its per-tab "●" config sheet, but the import no longer
 * depends on it.
 *
 * che168 blocks plain `fetch`, so every read goes through a headless browser.
 * The hard numbers (price, mileage, year) are parsed deterministically here;
 * DeepSeek reads the full page text and returns every other field plus the
 * copy; `reconcileListing` merges the two so a literal price read can never be
 * overridden by the model.
 */
import { chromium, type Browser } from "playwright";
import {
  Che168ParseError,
  field,
  parseBreadcrumbMakeModel,
  parseCnMileage,
  parseCnPrice,
  parseCnTransfers,
  parseCnYear,
  parseSrcId,
  reconcileListing,
  splitModelName,
  type DeterministicFacts,
  type ReconciledListing,
} from "@/lib/import/che168-parse";
import { canonicalMake } from "@/lib/data/vehicles";
import { extractListing } from "@/lib/import/deepseek";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const SPEC_TAB_RE =
  /^(Passive Safety|Active Safety|Driving & Handling|Driving Hardware|Driving Functions|Exterior & Anti-Theft|Exterior Lighting|Sunroof & Glass|Exterior Mirrors|Connectivity & Intelligence|Steering Wheel & Interior Rearview Mirror|Interior Charging|Seat Features|Audio & Interior Lighting|Air Conditioning & Refrigerator)$/;

export interface RawListing extends ReconciledListing {
  sourceUrl: string;
  srcId: string;
  imageUrls: string[];
  /** True when the English mirror was alive and contributed specs. */
  enMirrorUsed: boolean;
}

export class Che168ImportError extends Error {}

async function extractCn(browser: Browser, url: string) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
    userAgent: UA,
    locale: "zh-CN",
  });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
    });
    await page.waitForTimeout(1500);
    const text: string = await page.evaluate(() =>
      document.body.innerText.replace(/\n{2,}/g, "\n"),
    );
    const images: string[] = await page.evaluate(() =>
      [...new Set(
        [...document.querySelectorAll("img")]
          .flatMap((el) => [el.src, el.getAttribute("data-src"), el.getAttribute("data-original")])
          .filter((s): s is string => !!s && /autoimg\.cn/.test(s) && /900x675/.test(s))
          .map((s) => s.split("?")[0]),
      )],
    );
    return { text, images };
  } finally {
    await page.close();
  }
}

/**
 * The English mirror, or null if it is missing/sold. Never throws — the import
 * proceeds on the Chinese page alone when this comes back empty.
 */
async function extractEn(browser: Browser, srcId: string) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
  try {
    await page.goto(`https://global.che168.com/en/detail/${srcId}`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    await page.waitForTimeout(2000);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
    });
    await page.waitForTimeout(1200);

    const head: string = await page.evaluate(() =>
      document.body.innerText.replace(/\n{3,}/g, "\n").slice(0, 6000),
    );
    // A sold or missing listing has no vehicle details to offer.
    if (/vehicle has been sold|Vehicle Details/i.test(head) === false) {
      return null;
    }
    if (/vehicle has been sold/i.test(head)) {
      // Photos may still be present even when marked sold, so grab them, but
      // there is no reliable spec block — hand back only the images.
      const images = await enImages(page);
      return { head: "", specSheet: "", images, alive: false };
    }

    const images = await enImages(page);

    const tabs: string[] = await page.evaluate(
      (re) => [
        ...new Set(
          [...document.querySelectorAll("*")]
            .filter((e) => e.children.length === 0 && new RegExp(re).test((e.textContent || "").trim()))
            .map((e) => (e.textContent || "").trim()),
        ),
      ],
      SPEC_TAB_RE.source,
    );
    const specParts: string[] = [];
    for (const tab of tabs) {
      try {
        await page.locator(`text="${tab}"`).first().click({ timeout: 3500 });
        await page.waitForTimeout(600);
        const body: string = await page.evaluate(() => {
          const b = document.body.innerText.replace(/\r/g, "");
          const s = b.lastIndexOf("\nSpecifications\n");
          const e = b.indexOf("Recommended based on this vehicle");
          return s < 0 ? "" : b.slice(s, e > s ? e : s + 4000);
        });
        const idx = body.indexOf(`\n${tab}\n`);
        specParts.push(idx >= 0 ? body.slice(idx) : body);
      } catch {
        // Tab did not open — skip rather than fabricate its contents.
      }
    }
    return { head, specSheet: specParts.join("\n\n"), images, alive: true };
  } catch {
    return null;
  } finally {
    await page.close();
  }
}

function enImages(page: import("playwright").Page): Promise<string[]> {
  return page.evaluate(() =>
    [...new Set(
      [...document.querySelectorAll("img")]
        .flatMap((el) => [el.src, el.getAttribute("data-src"), el.getAttribute("data-original")])
        .filter((s): s is string => !!s && /autoimg\.cn/.test(s) && /1400x0_/.test(s))
        .map((s) => s.split("?")[0]),
    )],
  );
}

/** Dedupe che168's repeated photo sizes by their shared autohomecar hash. */
function dedupeImages(...groups: string[][]): string[] {
  const byHash = new Map<string, string>();
  for (const group of groups) {
    for (const u of group) {
      const m = u.match(/autohomecar__([A-Za-z0-9_-]+)\./);
      if (!m) continue;
      const big = u
        .replace(/\/\d+x\d+_\d+_q\d+_c\d+_/, "/1400x0_1_q87_")
        .replace(/\.webp$/, "");
      if (!byHash.has(m[1])) byHash.set(m[1], big);
    }
  }
  return [...byHash.values()];
}

export async function scrapeChe168Listing(rawUrl: string): Promise<RawListing> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Che168ImportError("That's not a valid URL.");
  }
  if (!/(^|\.)che168\.com$/.test(url.hostname)) {
    throw new Che168ImportError("Only che168.com listing links are supported.");
  }
  const srcId = parseSrcId(rawUrl);
  if (!srcId) {
    throw new Che168ImportError("Could not find a car id in that link.");
  }
  const cnUrl = `${url.origin}${url.pathname}`;

  const browser = await chromium.launch();
  let cn: Awaited<ReturnType<typeof extractCn>>;
  let en: Awaited<ReturnType<typeof extractEn>>;
  try {
    // The Chinese page is required; the English mirror is a bonus.
    [cn, en] = await Promise.all([
      extractCn(browser, cnUrl),
      extractEn(browser, srcId).catch(() => null),
    ]);
  } finally {
    await browser.close();
  }

  // Deterministic reads from the Chinese page — the hard numbers.
  let carRmb: number | undefined;
  try {
    carRmb = parseCnPrice(cn.text);
  } catch {
    carRmb = undefined; // let the AI try; reconcile throws if both fail
  }
  const enHead = en?.alive ? en.head : "";
  const crumb = enHead ? parseBreadcrumbMakeModel(enHead) : null;
  const det: DeterministicFacts = {
    carRmb,
    mileageKm: parseCnMileage(cn.text),
    year: parseCnYear(cn.text),
    previousOwners: parseCnTransfers(cn.text),
    make: crumb ? canonicalMake(crumb.make) : undefined,
    model: crumb?.model,
    trim: crumb
      ? splitModelName(field(enHead, "Model Name"), crumb.make).trim
      : undefined,
    colour: enHead ? field(enHead, "Exterior Color") || undefined : undefined,
  };

  // DeepSeek reads the full page(s) and fills everything else.
  const enText = en?.alive
    ? [en.head, en.specSheet].filter(Boolean).join("\n\n")
    : "";
  const ai = await extractListing({
    cnText: cn.text,
    enText: enText || undefined,
    known: {
      carRmb: det.carRmb,
      mileageKm: det.mileageKm,
      year: det.year,
      make: det.make,
      model: det.model,
    },
  });

  const reconciled = reconcileListing(det, ai);

  const imageUrls = dedupeImages(en?.images ?? [], cn.images);
  if (!imageUrls.length) {
    throw new Che168ImportError("Could not find any photos on that listing.");
  }

  return {
    ...reconciled,
    sourceUrl: rawUrl,
    srcId,
    imageUrls,
    enMirrorUsed: !!en?.alive,
  };
}

export { Che168ParseError };
