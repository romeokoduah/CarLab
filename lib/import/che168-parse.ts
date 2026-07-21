/**
 * Pure text parsing for scraped che168 listings.
 *
 * Split out from lib/import/che168.ts (which pulls in Playwright) so these can
 * be unit-tested against captured page text without launching a browser.
 */
import { canonicalMake } from "@/lib/data/vehicles";
import type { BodyType, Drivetrain, Fuel, Transmission } from "@/lib/types";

export class Che168ParseError extends Error {}

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
