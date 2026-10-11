/**
 * che168's own data feeds for a listing, as its mobile page loads them.
 *
 * The mobile page (m.che168.com/cardetail/index?infoid=<id>) shows little more
 * than price, mileage and a few headline specs as text, but it fills itself in
 * from three JSON feeds that carry the whole record:
 *
 *   getparamtypeitems  the factory spec sheet — dimensions, engine, gearbox,
 *                      chassis, tyres, and every equipment row marked
 *                      ● fitted / ○ optional extra / - not fitted
 *   getcarinfo         this car: brand, series, trim, colour, fuel, price (万),
 *                      mileage (万公里), first registration, transfers, remark
 *   getcarinfoext      the listing's highlighted equipment
 *
 * Their links are signed (`_sign`), so they are never built here: the import
 * helper re-reads the links the page itself called, and the server's browser
 * records the responses as the page receives them. This module only reads
 * what came back. Pure, so it is unit-tested against a captured response.
 */
import type { Drivetrain, Fuel, Transmission } from "@/lib/types";

/** Raw response bodies, as captured. Any of them may be missing. */
export interface ListingFeeds {
  paramtypeitems?: string;
  carinfo?: string;
  carinfoext?: string;
}

export const FEED_NAMES = ["paramtypeitems", "carinfo", "carinfoext"] as const;
/** The spec sheet is ~10 KB and the car record ~20 KB; anything far larger is not one. */
export const MAX_FEED_CHARS = 200_000;
export type FeedName = (typeof FEED_NAMES)[number];

/**
 * Which feed a request URL belongs to, or null. Matched on the path so that
 * the similarly named endpoints the page also calls (getcarinfoext vs
 * getcarinfo, getactivecarinfo, …) are never confused.
 */
export function feedForUrl(url: string): FeedName | null {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  if (/\/car\/getparamtypeitems$/.test(path)) return "paramtypeitems";
  if (/\/car\/getcarinfoext$/.test(path)) return "carinfoext";
  if (/\/car\/getcarinfo$/.test(path)) return "carinfo";
  return null;
}

interface ParamRow {
  name: string;
  content: string;
}
interface ParamGroup {
  title: string;
  data: ParamRow[];
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

/** The feed's `result`, but only from a successful response about THIS car. */
function result(raw: string | undefined, srcId: string): unknown {
  if (!raw) return undefined;
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isObject(body) || body.returncode !== 0) return undefined;
  const r = body.result;
  // getcarinfo names its car; a response about any other listing is dropped.
  if (isObject(r) && "infoid" in r && String(r.infoid) !== srcId) return undefined;
  return r;
}

function paramGroups(raw: string | undefined, srcId: string): ParamGroup[] {
  const r = result(raw, srcId);
  if (!Array.isArray(r)) return [];
  return r
    .filter(isObject)
    .map((g) => ({
      title: typeof g.title === "string" ? g.title : "",
      data: (Array.isArray(g.data) ? g.data : [])
        .filter(isObject)
        .map((d) => ({
          name: typeof d.name === "string" ? d.name.trim() : "",
          content: typeof d.content === "string" ? d.content.trim() : "",
        }))
        .filter((d) => d.name),
    }));
}

/** Sections of hard specs, as opposed to equipment checklists. */
const SPEC_GROUPS = new Set(["基本参数", "车身", "发动机", "电动机", "电池/充电", "变速箱", "底盘转向", "车轮制动"]);
/** Rows that must not reach the storefront copy, or say nothing about the car. */
const DROPPED_ROWS = new Set(["厂商指导价(元)", "厂商", "整车质保", "首任车主质保政策"]);

/**
 * An equipment row reduced to what is actually fitted.
 *
 * "●" is fitted, "○" an optional extra the factory offered (NOT confirmed on
 * this car) and "-" not fitted. A row can mix them across lines or positions
 * ("●运动\n●经济", "前● / 后-", "○加热\n○通风"), so lines without a ● are
 * dropped and a row with no ● at all is dropped entirely.
 */
function fittedOnly(content: string): string | null {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes("●"));
  return lines.length ? lines.join("; ") : null;
}

/**
 * The spec sheet as compact text for DeepSeek: hard specs with a value, and
 * only the equipment that is fitted. The plate/insurance dates, the factory
 * list price and the warranty rows are left out.
 */
export function specSheetText(feeds: ListingFeeds, srcId: string): string {
  const out: string[] = [];
  for (const g of paramGroups(feeds.paramtypeitems, srcId)) {
    if (g.title === "牌照信息") continue;
    const spec = SPEC_GROUPS.has(g.title);
    const rows: string[] = [];
    for (const { name, content } of g.data) {
      if (DROPPED_ROWS.has(name)) continue;
      if (spec) {
        if (content && content !== "-") rows.push(`${name}: ${content.replace(/\n/g, "; ")}`);
      } else {
        const fitted = fittedOnly(content);
        if (fitted) rows.push(`${name}: ${fitted}`);
      }
    }
    if (rows.length) out.push(`【${g.title}】`, ...rows);
  }

  const ext = result(feeds.carinfoext, srcId);
  const options = isObject(ext) && isObject(ext.options) ? ext.options : undefined;
  const highlights = new Set<string>();
  const addOpts = (list: unknown) => {
    for (const o of Array.isArray(list) ? list : []) {
      if (isObject(o) && typeof o.optionname === "string" && o.optionname.trim()) {
        highlights.add(o.optionname.trim());
      }
    }
  };
  if (options) {
    addOpts(options.displayopts);
    for (const g of Array.isArray(options.moreoptions) ? options.moreoptions : []) {
      if (isObject(g)) addOpts(g.opts);
    }
  }
  if (highlights.size) out.push("【亮点配置 (fitted)】", [...highlights].join("、"));

  return out.join("\n");
}

/** The listing's own record as plain text: brand, series, trim, colour, seller's remark. */
export function carInfoText(feeds: ListingFeeds, srcId: string): string {
  const r = result(feeds.carinfo, srcId);
  if (!isObject(r)) return "";
  const pick: [string, string][] = [
    ["品牌", "brandname"],
    ["车系", "seriesname"],
    ["车型", "specname"],
    ["车辆名称", "carname"],
    ["颜色", "colorname"],
    ["燃料", "fuelname"],
    ["变速箱", "gearbox"],
    ["排量", "displacement"],
    ["首次上牌", "firstregdate"],
    ["表显里程(万公里)", "mileage"],
    ["价格(万)", "price"],
    ["过户次数", "transfercount"],
    ["卖家说", "remark"],
  ];
  return pick
    .map(([label, key]) => {
      const v = r[key];
      return (typeof v === "string" && v.trim()) || typeof v === "number" ? `${label}: ${v}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

/** Every spec-sheet row that has a value, by its Chinese name (first wins). */
export function specRows(feeds: ListingFeeds, srcId: string): Map<string, string> {
  const rows = new Map<string, string>();
  for (const g of paramGroups(feeds.paramtypeitems, srcId)) {
    for (const { name, content } of g.data) {
      if (content && content !== "-" && !rows.has(name)) rows.set(name, content);
    }
  }
  return rows;
}

/** Facts the feeds state outright — read literally, never left to the AI. */
export interface FeedFacts {
  carRmb?: number;
  mileageKm?: number;
  year?: number;
  previousOwners?: number;
  fuel?: Fuel;
  transmission?: Transmission;
  drivetrain?: Drivetrain;
  seats?: number;
  doors?: number;
  cylinders?: number;
  horsepower?: number;
  engineCapacity?: string;
}

const positive = (s: string | undefined): number | undefined => {
  const n = s == null ? NaN : parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const positiveInt = (s: string | undefined): number | undefined => {
  const n = positive(s);
  return n != null && Number.isInteger(n) ? n : undefined;
};

export function feedFacts(feeds: ListingFeeds, srcId: string): FeedFacts {
  const facts: FeedFacts = {};

  const car = result(feeds.carinfo, srcId);
  if (isObject(car) && String(car.infoid) === srcId) {
    const price = typeof car.price === "number" ? car.price : positive(String(car.price ?? ""));
    if (price && price > 0) facts.carRmb = Math.round(price * 10000);
    const mileage = typeof car.mileage === "number" ? car.mileage : positive(String(car.mileage ?? ""));
    if (mileage != null && mileage >= 0) facts.mileageKm = Math.round(mileage * 10000);
    const year = String(car.firstregdate ?? "").match(/^(\d{4})/);
    if (year && +year[1] >= 1980 && +year[1] <= 2100) facts.year = +year[1];
    if (typeof car.transfercount === "number" && car.transfercount >= 0) {
      facts.previousOwners = car.transfercount;
    }
  }

  const rows = specRows(feeds, srcId);
  if (!rows.size) return facts;

  facts.seats = positiveInt(rows.get("座位数(个)"));
  facts.doors = positiveInt(rows.get("车门数(个)"));

  const energy = rows.get("能源类型") ?? rows.get("燃料形式") ?? "";
  const electric = /纯电/.test(energy);
  if (electric) facts.fuel = "Electric";
  else if (/混|增程/.test(energy)) facts.fuel = "Hybrid";
  else if (/柴油/.test(energy)) facts.fuel = "Diesel";
  else if (/汽油/.test(energy)) facts.fuel = "Petrol";

  if (!electric) {
    facts.cylinders = positiveInt(rows.get("气缸数(个)"));
    const litres = positive(rows.get("排量(L)"));
    if (litres) {
      const boosted = /涡轮|增压/.test(rows.get("进气形式") ?? "");
      facts.engineCapacity = `${litres.toFixed(1)}L${boosted ? " Turbo" : ""}`;
    }
  }
  // 马力 (PS) is what che168 states and what earlier imports stored.
  facts.horsepower = positiveInt(rows.get("最大马力(Ps)"));

  const gearbox = `${rows.get("变速箱类型") ?? ""} ${rows.get("简称") ?? ""}`;
  if (/手动/.test(gearbox)) facts.transmission = "Manual";
  else if (gearbox.trim() || electric) facts.transmission = "Automatic";

  const drive = `${rows.get("驱动方式") ?? ""} ${rows.get("四驱形式") ?? ""}`;
  if (/四驱/.test(drive)) facts.drivetrain = /分时/.test(drive) ? "4WD" : "AWD";
  else if (/前驱/.test(drive)) facts.drivetrain = "FWD";
  else if (/后驱/.test(drive)) facts.drivetrain = "RWD";

  for (const k of Object.keys(facts) as (keyof FeedFacts)[]) {
    if (facts[k] === undefined) delete facts[k];
  }
  return facts;
}
