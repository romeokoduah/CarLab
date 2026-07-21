/**
 * Server-side scraper for a che168.com dealer listing.
 *
 * che168 blocks plain `fetch` (Cloudflare-style checks), so every read here
 * goes through a real headless browser. Two pages are read per listing:
 *  - the Chinese dealer page (`www.che168.com/dealer/.../<id>.html`) — the
 *    only place the RMB asking price, mileage, first-registration date,
 *    transfer count and the dealer's own "highlight" tags live.
 *  - the English mirror (`global.che168.com/en/detail/<id>`) — clean English
 *    vehicle details (engine, drivetrain, dimensions, colour) plus the
 *    per-tab configuration sheet, where "●" marks a fitted item and "-"
 *    marks one that is NOT fitted.
 *
 * Everything with a definite, factual value (year, mileage, price, engine,
 * drivetrain, seats…) is parsed deterministically with regexes below — never
 * guessed. The per-tab "●" sheets and the dealer's highlight tags are instead
 * bundled as `specContext` for the DeepSeek step, which only turns confirmed
 * rows into prose and a feature list — it never invents a field this module
 * couldn't read.
 */
import { chromium } from "playwright";
import type { BodyType, Drivetrain, Fuel, Transmission } from "@/lib/types";

const SPEC_TAB_RE =
  /^(Passive Safety|Active Safety|Driving & Handling|Driving Hardware|Driving Functions|Exterior & Anti-Theft|Exterior Lighting|Sunroof & Glass|Exterior Mirrors|Connectivity & Intelligence|Steering Wheel & Interior Rearview Mirror|Interior Charging|Seat Features|Audio & Interior Lighting|Air Conditioning & Refrigerator)$/;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Dealer "highlight" tags are a fixed platform vocabulary — translate what we recognise. */
const CN_HIGHLIGHT_MAP: Record<string, string[]> = {
  "并线辅助": ["Blind-spot monitor"],
  "主动刹车/主动安全系统": ["Automatic emergency braking"],
  "ISOFIX儿童座椅接口": ["ISOFIX child seats"],
  "自动驻车": ["Auto hold"],
  "电动后备厢": ["Power tailgate"],
  "无钥匙启动系统": ["Keyless entry", "Push-button start"],
  "全液晶仪表盘": ["Digital instrument cluster"],
  "蓝牙/车载电话": ["Bluetooth"],
  "车联网": ["Connected-car (IoT) services"],
  "OTA升级": ["Over-the-air (OTA) software updates"],
  "车内PM2.5过滤装置": ["In-car air purifier"],
  "转向辅助灯": ["Cornering-assist headlamps"],
  "车道保持辅助系统": ["Lane-keep assist"],
  "车道偏离预警系统": ["Forward collision warning"],
  "全景大天窗": ["Panoramic roof"],
  "360全景摄像头": ["360° camera"],
};

export interface RawListing {
  sourceUrl: string;
  srcId: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  mileageKm: number;
  colour: string;
  previousOwners: number;
  carRmb: number;
  bodyType: BodyType;
  transmission: Transmission;
  fuel: Fuel;
  drivetrain?: Drivetrain;
  seats?: number;
  doors?: number;
  cylinders?: number;
  horsepower?: number;
  engineCapacity?: string;
  imageUrls: string[];
  /** Raw ● config-sheet dumps + translated dealer highlight tags, for the AI step. */
  specContext: string;
  /** Untranslated highlight phrases we don't have a dictionary entry for. */
  unrecognisedHighlights: string[];
}

export class Che168ImportError extends Error {}

function parseSrcId(url: URL): string {
  const m = url.pathname.match(/\/(\d+)\.html$/);
  if (!m) throw new Che168ImportError("That doesn't look like a che168 listing link (expected .../<id>.html).");
  return m[1];
}

function parseCnPrice(text: string): number {
  const wan = text.match(/¥\s*([\d.]+)\s*万/);
  if (wan) return Math.round(parseFloat(wan[1]) * 10000);
  const plain = text.match(/¥\s*([\d,]+)(?!\s*万)/);
  if (plain) return Math.round(parseFloat(plain[1].replace(/,/g, "")));
  throw new Che168ImportError("Could not find an asking price (¥) on that listing.");
}

function parseCnMileage(text: string): number | undefined {
  const wan = text.match(/表显里程([\d.]+)万公里/);
  if (wan) return Math.round(parseFloat(wan[1]) * 10000);
  const plain = text.match(/表显里程([\d.]+)公里/);
  if (plain) return Math.round(parseFloat(plain[1]));
  return undefined;
}

function parseCnTransfers(text: string): number {
  const m = text.match(/过户次数(\d+)次/);
  return m ? parseInt(m[1], 10) : 0;
}

function parseCnHighlights(text: string): { features: string[]; unrecognised: string[] } {
  const start = text.indexOf("配置亮点");
  if (start < 0) return { features: [], unrecognised: [] };
  const end = text.indexOf("配置可能存在加改装");
  const block = text.slice(start + 4, end > start ? end : start + 600);
  const phrases = block
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s && s !== "更多亮点配置" && s.length < 20);

  const features: string[] = [];
  const unrecognised: string[] = [];
  for (const p of phrases) {
    const mapped = CN_HIGHLIGHT_MAP[p];
    if (mapped) features.push(...mapped);
    else unrecognised.push(p);
  }
  return { features, unrecognised };
}

function mapFuel(s: string): Fuel {
  const v = s.toLowerCase();
  if (v.includes("diesel")) return "Diesel";
  if (v.includes("hybrid")) return "Hybrid";
  if (v.includes("electric")) return "Electric";
  return "Petrol";
}

function mapTransmission(transmissionType: string): Transmission {
  return /\bmanual transmission\s*\(mt\)/i.test(transmissionType) ? "Manual" : "Automatic";
}

function mapDrivetrain(s: string): Drivetrain | undefined {
  if (/front-wheel/i.test(s)) return "FWD";
  if (/rear-wheel/i.test(s)) return "RWD";
  if (/all-wheel/i.test(s)) return "AWD";
  if (/four-wheel|4wd/i.test(s)) return "4WD";
  return undefined;
}

function mapBodyType(bodyTypeField: string, classField: string): BodyType {
  const v = `${bodyTypeField} ${classField}`.toLowerCase();
  if (v.includes("sedan")) return "Sedan";
  if (v.includes("hatchback")) return "Hatchback";
  if (v.includes("pickup")) return "Pickup";
  if (v.includes("coupe")) return "Coupe";
  if (v.includes("van") || v.includes("mpv")) return "Van";
  return "SUV";
}

/** "Changan Automobile" -> "Changan"; strips the common company-suffix words. */
function cleanMake(manufacturer: string): string {
  return manufacturer.replace(/\s*(Automobile|Motor(s)?|Auto)\b.*/i, "").trim();
}

/** Inserts a space before a trailing "PLUS"/"Plus" glued to digits, e.g. "CS75PLUS" -> "CS75 PLUS". */
function cleanModel(model: string): string {
  return model.replace(/(\d)(PLUS|Plus)\b/, "$1 $2").trim();
}

function field(block: string, label: string): string {
  const re = new RegExp(`${label}\\n([^\\n]*)`, "i");
  return block.match(re)?.[1]?.trim() ?? "";
}

async function extractCn(url: string) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
      userAgent: UA,
      locale: "zh-CN",
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
    });
    await page.waitForTimeout(1500);
    const text: string = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, "\n"));
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
    await browser.close();
  }
}

async function extractEn(srcId: string) {
  const url = `https://global.che168.com/en/detail/${srcId}`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
    });
    await page.waitForTimeout(1500);

    const head: string = await page.evaluate(() =>
      document.body.innerText.replace(/\n{3,}/g, "\n").slice(0, 6000),
    );

    const images: string[] = await page.evaluate(() =>
      [...new Set(
        [...document.querySelectorAll("img")]
          .flatMap((el) => [el.src, el.getAttribute("data-src"), el.getAttribute("data-original")])
          .filter((s): s is string => !!s && /autoimg\.cn/.test(s) && /1400x0_/.test(s))
          .map((s) => s.split("?")[0]),
      )],
    );

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
        await page.locator(`text="${tab}"`).first().click({ timeout: 4000 });
        await page.waitForTimeout(700);
        const body: string = await page.evaluate(() => {
          const b = document.body.innerText.replace(/\r/g, "");
          const s = b.lastIndexOf("\nSpecifications\n");
          const e = b.indexOf("Recommended based on this vehicle");
          return s < 0 ? "" : b.slice(s, e > s ? e : s + 4000);
        });
        // Keep only this tab's own section (from its own heading onward).
        const idx = body.indexOf(`\n${tab}\n`);
        specParts.push(idx >= 0 ? body.slice(idx) : body);
      } catch {
        // Tab failed to open — skip it rather than fabricate its contents.
      }
    }

    return { head, images, specSheet: specParts.join("\n\n") };
  } finally {
    await browser.close();
  }
}

/** Dedupe che168's repeated photo sizes by their shared autohomecar hash, preferring the largest. */
function dedupeImages(enImages: string[], cnImages: string[]): string[] {
  const byHash = new Map<string, string>();
  const add = (u: string) => {
    const m = u.match(/autohomecar__([A-Za-z0-9_-]+)\./);
    if (!m) return;
    const big = u.replace(/\/\d+x\d+_\d+_q\d+_c\d+_/, "/1400x0_1_q87_").replace(/\.webp$/, "");
    if (!byHash.has(m[1])) byHash.set(m[1], big);
  };
  enImages.forEach(add);
  cnImages.forEach(add);
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
  const srcId = parseSrcId(url);
  const cnUrl = `${url.origin}${url.pathname}`;

  const [cn, en] = await Promise.all([extractCn(cnUrl), extractEn(srcId)]);

  const carRmb = parseCnPrice(cn.text);
  const mileageKm = parseCnMileage(cn.text) ?? (() => {
    const m = en.head.match(/Mileage \(km\)\n(\d+)/);
    if (!m) throw new Che168ImportError("Could not find the mileage on that listing.");
    return parseInt(m[1], 10);
  })();
  const previousOwners = parseCnTransfers(cn.text);
  const { features: highlightFeatures, unrecognised } = parseCnHighlights(cn.text);

  const regDate = field(en.head, "1st Reg\\. Date");
  const year = parseInt(regDate.slice(0, 4), 10) || new Date().getFullYear();
  const fuel = mapFuel(field(en.head, "Fuel Type"));
  const engine = field(en.head, "Engine \\(cc\\)");
  const horsepower = parseInt(engine.match(/(\d+)\s*hp/i)?.[1] ?? "", 10) || undefined;
  const cylinders = parseInt(engine.match(/L(\d)/)?.[1] ?? "", 10) || undefined;
  const displacementL = engine.match(/([\d.]+)T?\b/)?.[1];
  const isTurbo = /T\b/.test(engine.split(" ")[0] ?? "");
  const engineCapacity = displacementL ? `${displacementL}L${isTurbo ? " Turbo" : ""}` : undefined;
  const transmission = mapTransmission(field(en.head, "Trans\\."));
  const drivetrain = mapDrivetrain(field(en.head, "Drive Train"));
  const bodyType = mapBodyType(field(en.head, "Body Type"), field(en.head, "Class"));
  const seats = parseInt(field(en.head, "Seats"), 10) || undefined;
  const doors = parseInt(field(en.head, "Doors"), 10) || undefined;
  const colour = field(en.head, "Exterior Color") || "Unspecified";

  const modelName = field(en.head, "Model Name");
  const manufacturer = field(en.head, "Manufacturer");
  const make = cleanMake(manufacturer) || modelName.split(" ")[0] || "Unknown";
  const yearMatch = modelName.match(/\b(19|20)\d{2}\b/);
  const model = cleanModel(
    yearMatch ? modelName.slice(make.length, yearMatch.index).trim() : modelName,
  ) || "Unknown";
  const trim = (yearMatch
    ? modelName.slice(yearMatch.index! + yearMatch[0].length).trim()
    : ""
  ).replace(/\b(Automatic|Manual|Semi-Automatic)\b\s*/gi, "").trim();

  const imageUrls = dedupeImages(en.images, cn.images);
  if (!imageUrls.length) {
    throw new Che168ImportError("Could not find any photos on that listing.");
  }

  const highlightContext = highlightFeatures.length
    ? `Dealer highlight tags (confirmed fitted): ${highlightFeatures.join(", ")}`
    : "";
  const untranslatedContext = unrecognised.length
    ? `Untranslated dealer tags (Chinese, confirmed fitted — translate only if clearly an equipment name, else skip): ${unrecognised.join(", ")}`
    : "";
  const specContext = [highlightContext, untranslatedContext, en.specSheet]
    .filter(Boolean)
    .join("\n\n");

  return {
    sourceUrl: rawUrl,
    srcId,
    make,
    model,
    trim,
    year,
    mileageKm,
    colour,
    previousOwners,
    carRmb,
    bodyType,
    transmission,
    fuel,
    drivetrain,
    seats,
    doors,
    cylinders,
    horsepower,
    engineCapacity,
    imageUrls,
    specContext,
    unrecognisedHighlights: unrecognised,
  };
}
