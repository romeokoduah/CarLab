/**
 * Pure text parsing for scraped che168 listings.
 *
 * Split out from lib/import/che168.ts (which pulls in Playwright) so these can
 * be unit-tested against captured page text without launching a browser.
 */
import { canonicalMake } from "@/lib/data/vehicles";
import type { BodyType, Drivetrain, Fuel, Transmission } from "@/lib/types";

export class Che168ParseError extends Error {}

/**
 * The numeric car id out of ANY che168 link.
 *
 * che168 uses several URL shapes and every one of them ends in the car id:
 *   www.che168.com/dealer/676896/59072492.html   (dealer listing)
 *   www.che168.com/<city>/59072492.html          (city listing)
 *   global.che168.com/en/detail/59072492         (English mirror)
 * plus a tail of ?query and #hash junk. We take the last id-shaped run in the
 * path so a new link shape keeps working without a code change.
 */
export function parseSrcId(rawUrl: string): string | null {
  let path: string;
  try {
    path = new URL(rawUrl).pathname;
  } catch {
    return null;
  }
  // `/detail/<id>` (EN) or `<id>.html` (CN) first — the precise, known forms.
  const detail = path.match(/\/detail\/(\d{5,})/);
  if (detail) return detail[1];
  const html = path.match(/(\d{5,})\.html$/);
  if (html) return html[1];
  // Fall back to the last long numeric segment anywhere in the path.
  const all = path.match(/\d{5,}/g);
  return all?.length ? all[all.length - 1] : null;
}

/** Reads a `Label\nValue` pair out of the English page's details block. */
export function field(block: string, label: string): string {
  const re = new RegExp(`${label}\\n([^\\n]*)`, "i");
  return block.match(re)?.[1]?.trim() ?? "";
}

export function parseCnPrice(text: string): number {
  const wan = text.match(/¥\s*([\d.]+)\s*万/);
  if (wan) return Math.round(parseFloat(wan[1]) * 10000);
  const plain = text.match(/¥\s*([\d,]+)(?!\s*万)/);
  if (plain) return Math.round(parseFloat(plain[1].replace(/,/g, "")));
  throw new Che168ParseError("Could not find an asking price (¥) on that listing.");
}

export function parseCnMileage(text: string): number | undefined {
  const wan = text.match(/表显里程([\d.]+)万公里/);
  if (wan) return Math.round(parseFloat(wan[1]) * 10000);
  const plain = text.match(/表显里程([\d.]+)公里/);
  if (plain) return Math.round(parseFloat(plain[1]));
  return undefined;
}

export function parseCnTransfers(text: string): number {
  const m = text.match(/过户次数(\d+)次/);
  return m ? parseInt(m[1], 10) : 0;
}

/** First-registration year from the Chinese archive (上牌时间2023年10月). */
export function parseCnYear(text: string): number | undefined {
  const m = text.match(/上牌时间\s*(\d{4})年/);
  const y = m ? parseInt(m[1], 10) : NaN;
  return y >= 1980 && y <= 2100 ? y : undefined;
}

// ── Make / model ───────────────────────────────────────────────────────────

/**
 * The English page's breadcrumb: `Home / Used Cars / <Make> / <Make> <Series>`.
 *
 * This is the ONLY trustworthy source for the brand. The "Manufacturer" field
 * further down the page is the parent *company*, so every sub-brand comes out
 * wrong there — a Jetour reads "Chery Automobile", and Wuling, Baojun, Exeed,
 * Lynk & Co, Denza and friends have the same problem. The breadcrumb also
 * spells the series the way buyers expect ("CS75 PLUS"), where the Model Name
 * field runs it together ("CS75PLUS").
 */
export function parseBreadcrumbMakeModel(
  head: string,
): { make: string; model: string } | null {
  const lines = head.split("\n").map((s) => s.trim());
  for (let i = 0; i + 6 < lines.length; i++) {
    if (
      lines[i] !== "Home" ||
      lines[i + 1] !== "/" ||
      lines[i + 2] !== "Used Cars" ||
      lines[i + 3] !== "/" ||
      lines[i + 5] !== "/"
    ) {
      continue;
    }
    const make = lines[i + 4];
    const seriesCrumb = lines[i + 6];
    if (!make || make === "/" || !seriesCrumb || seriesCrumb === "/") return null;
    // The series crumb repeats the brand: "Jetour X70 PLUS" -> "X70 PLUS".
    const model = stripLeading(seriesCrumb, make);
    return { make, model: model || seriesCrumb };
  }
  return null;
}

/** Removes a leading `prefix` word from `value`, case-insensitively. */
function stripLeading(value: string, prefix: string): string {
  if (!prefix) return value.trim();
  const lower = value.toLowerCase();
  const p = prefix.toLowerCase();
  // Only strip on a word boundary, so "Changan" never eats into "Changanetc".
  if (lower.startsWith(p) && /^[\s-]/.test(value.slice(prefix.length) || " ")) {
    return value.slice(prefix.length).trim();
  }
  return value.trim();
}

/** Splits the trailing trim off a "Make Series 2021 1.5T Automatic Luxury" string. */
export function splitModelName(
  modelName: string,
  make: string,
): { model: string; trim: string } {
  const yearMatch = modelName.match(/\b(19|20)\d{2}\b/);
  const beforeYear = yearMatch
    ? modelName.slice(0, yearMatch.index).trim()
    : modelName.trim();
  const afterYear = yearMatch
    ? modelName.slice(yearMatch.index! + yearMatch[0].length).trim()
    : "";
  return {
    // Strip by matching the brand as text, never by its character count — the
    // old `slice(make.length)` turned "Jetour X70" into "r X70" whenever the
    // brand and the parent company had different lengths.
    model: stripLeading(beforeYear, make),
    trim: afterYear.replace(/\b(Automatic|Manual|Semi-Automatic)\b\s*/gi, "").trim(),
  };
}

/** Inserts the missing space in a run-together "CS75PLUS" style model name. */
export function cleanModel(model: string): string {
  return model.replace(/(\d)(PLUS|Plus|PRO|Pro|MAX|Max)\b/, "$1 $2").trim();
}

/**
 * Make, model and trim for a listing, preferring the breadcrumb and falling
 * back to the Model Name / Manufacturer fields only when it is missing.
 */
export function parseMakeModelTrim(head: string): {
  make: string;
  model: string;
  trim: string;
} {
  const modelName = field(head, "Model Name");
  const crumb = parseBreadcrumbMakeModel(head);

  if (crumb) {
    const { trim } = splitModelName(modelName, crumb.make);
    return {
      make: canonicalMake(crumb.make),
      model: cleanModel(crumb.model),
      trim,
    };
  }

  // No breadcrumb: the brand is the Model Name's first word. That beats the
  // Manufacturer field, which names the parent company for every sub-brand.
  const fallbackMake = modelName.split(/\s+/)[0] ?? "";
  const { model, trim } = splitModelName(modelName, fallbackMake);
  return {
    make: canonicalMake(fallbackMake) || "Unknown",
    model: cleanModel(model) || "Unknown",
    trim,
  };
}

// ── Enum mapping ───────────────────────────────────────────────────────────

export function mapFuel(s: string): Fuel {
  const v = s.toLowerCase();
  if (v.includes("diesel")) return "Diesel";
  if (v.includes("hybrid")) return "Hybrid";
  if (v.includes("electric")) return "Electric";
  return "Petrol";
}

export function mapTransmission(transmissionType: string): Transmission {
  return /\bmanual transmission\s*\(mt\)/i.test(transmissionType)
    ? "Manual"
    : "Automatic";
}

export function mapDrivetrain(s: string): Drivetrain | undefined {
  if (/front-wheel/i.test(s)) return "FWD";
  if (/rear-wheel/i.test(s)) return "RWD";
  if (/all-wheel/i.test(s)) return "AWD";
  if (/four-wheel|4wd/i.test(s)) return "4WD";
  return undefined;
}

export function mapBodyType(bodyTypeField: string, classField: string): BodyType {
  const v = `${bodyTypeField} ${classField}`.toLowerCase();
  if (v.includes("sedan")) return "Sedan";
  if (v.includes("hatchback")) return "Hatchback";
  if (v.includes("pickup")) return "Pickup";
  if (v.includes("coupe")) return "Coupe";
  if (v.includes("van") || v.includes("mpv")) return "Van";
  return "SUV";
}

// ── Reconciling the deterministic read with the AI's full extraction ─────────

export const BODY_TYPES: BodyType[] = [
  "SUV", "Sedan", "Hatchback", "Pickup", "Coupe", "Van",
];
export const FUELS: Fuel[] = ["Petrol", "Diesel", "Hybrid", "Electric"];
export const TRANSMISSIONS: Transmission[] = ["Automatic", "Manual"];
export const DRIVETRAINS: Drivetrain[] = ["FWD", "RWD", "AWD", "4WD"];

/** What DeepSeek returns after reading the page — every field it could find. */
export interface ExtractedListing {
  make: string;
  model: string;
  trim: string;
  year?: number;
  mileageKm?: number;
  colour: string;
  bodyType?: BodyType;
  fuel?: Fuel;
  transmission?: Transmission;
  drivetrain?: Drivetrain;
  seats?: number;
  doors?: number;
  cylinders?: number;
  horsepower?: number;
  engineCapacity?: string;
  carRmb?: number;
  description: string;
  features: string[];
}

/** What the scraper reads with regex — the hard numbers that must be exact. */
export interface DeterministicFacts {
  carRmb?: number;
  mileageKm?: number;
  year?: number;
  previousOwners: number;
  /** Only set when the English breadcrumb was present (reliable when it is). */
  make?: string;
  model?: string;
  trim?: string;
  /** English colour, if the EN mirror was alive. */
  colour?: string;
}

export interface ReconciledListing {
  make: string;
  model: string;
  trim: string;
  year: number;
  mileageKm: number;
  colour: string;
  previousOwners: number;
  carRmb: number;
  bodyType: BodyType;
  fuel: Fuel;
  transmission: Transmission;
  drivetrain?: Drivetrain;
  seats?: number;
  doors?: number;
  cylinders?: number;
  horsepower?: number;
  engineCapacity?: string;
  description: string;
  features: string[];
}

const oneOf = <T>(value: unknown, allowed: readonly T[]): T | undefined =>
  allowed.includes(value as T) ? (value as T) : undefined;

const posInt = (n: unknown): number | undefined =>
  typeof n === "number" && Number.isInteger(n) && n > 0 ? n : undefined;

/**
 * Merge the deterministic read with the AI's extraction.
 *
 * The three hard numbers a wrong value would cost money or mislead on — price,
 * mileage, registration year — are taken from the literal regex read whenever
 * it succeeded, with the AI only as a fallback. The make and model prefer the
 * English breadcrumb (reliable when present, e.g. sorts sub-brands correctly)
 * and fall back to the AI, which is essential when the English mirror is dead
 * and only the Chinese page describes the car. Everything descriptive is the
 * AI's, since it read the whole page; deterministic EN values are the backup.
 */
export function reconcileListing(
  det: DeterministicFacts,
  ai: ExtractedListing,
): ReconciledListing {
  const carRmb = det.carRmb ?? posInt(ai.carRmb);
  if (!carRmb) {
    throw new Che168ParseError("Could not read the asking price from that listing.");
  }
  const mileageKm = det.mileageKm ?? posInt(ai.mileageKm);
  if (mileageKm == null) {
    throw new Che168ParseError("Could not read the mileage from that listing.");
  }

  const make = firstNonEmpty(det.make, ai.make) || "Unknown";
  const model = firstNonEmpty(det.model, ai.model) || "Unknown";

  return {
    make,
    model,
    trim: firstNonEmpty(det.trim, ai.trim),
    year: det.year ?? posInt(ai.year) ?? new Date().getFullYear(),
    mileageKm,
    colour: firstNonEmpty(ai.colour, det.colour) || "Unspecified",
    previousOwners: det.previousOwners,
    carRmb,
    bodyType: oneOf(ai.bodyType, BODY_TYPES) ?? "SUV",
    fuel: oneOf(ai.fuel, FUELS) ?? "Petrol",
    transmission: oneOf(ai.transmission, TRANSMISSIONS) ?? "Automatic",
    drivetrain: oneOf(ai.drivetrain, DRIVETRAINS),
    seats: posInt(ai.seats),
    doors: posInt(ai.doors),
    cylinders: posInt(ai.cylinders),
    horsepower: posInt(ai.horsepower),
    engineCapacity: ai.engineCapacity?.trim() || undefined,
    description: ai.description.trim(),
    features: [...new Set(ai.features.map((f) => f.trim()).filter(Boolean))],
  };
}

function firstNonEmpty(...vals: (string | undefined)[]): string {
  for (const v of vals) {
    const t = v?.trim();
    if (t && t.toLowerCase() !== "unknown") return t;
  }
  return "";
}
