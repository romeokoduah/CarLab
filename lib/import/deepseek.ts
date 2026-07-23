/**
 * DeepSeek reads a scraped che168 listing and returns the full structured
 * record — make, model, year, colour, body, fuel and the rest — plus the
 * sales description and feature list.
 *
 * The Chinese dealer page is the source of truth: it carries every car,
 * including ones whose English mirror is missing or already sold, and it is
 * the page the admin actually pastes. The English mirror, when it is alive,
 * is handed over too as cleaner confirmation. The model reads BOTH and returns
 * one answer, romanising Chinese brand names to the name buyers know.
 *
 * Deterministic facts the scraper already read with regex (price, mileage,
 * registration year, and the English breadcrumb make/model) are passed in as
 * KNOWN FACTS to honour, and the caller reconciles the two afterwards
 * (lib/import/che168-parse.ts) so a wrong AI number can never override a
 * literal read of the price.
 */
import type { ExtractedListing } from "@/lib/import/che168-parse";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

const SYSTEM_PROMPT = `You are a meticulous vehicle-data extractor for a Ghana-based car importer. You are given the scraped text of a used-car listing from the Chinese marketplace che168.com (a Chinese dealer page, and sometimes an English mirror). Return one structured record describing THIS specific vehicle.

Extract EVERY field you can support from the text. Do not leave a field blank or "Unknown" when the text lets you determine it — read the Chinese if the English is missing. But never invent a value the text does not support; use null for a field the listing genuinely does not state.

FIELD RULES:
- make: the vehicle brand in the English/internationally-recognised name. Romanise Chinese-only brands to their official English name (e.g. 飞凡 → "Rising Auto", 比亚迪 → "BYD", 长安 → "Changan", 吉利 → "Geely", 埃安/广汽埃安 → "Aion", 深蓝 → "Deepal", 极氪 → "Zeekr", 领克 → "Lynk & Co", 星途 → "Exeed", 捷途 → "Jetour", 欧尚 → "Auchan"). Use the marque, never the parent company.
- model: the model/series only, without the brand or year (e.g. "R7", "X70 PLUS", "CS75 PLUS", "UNI-K").
- trim: the trim/variant in English, translating the Chinese (进阶版 → "Advanced", 尊贵型 → "Premium", 卓越型 → "Excellence", 精英型 → "Elite", 豪华型 → "Luxury"). Empty string if none.
- year: the first-registration year (from 上牌时间 / 1st Reg. Date) as a 4-digit number.
- mileageKm: odometer reading in kilometres as a number (表显里程; 万公里 means ×10000).
- colour: exterior colour in English (白色 → "White", 黑色 → "Black", 银/灰色 → "Silver", 蓝色 → "Blue", 红色 → "Red").
- bodyType: EXACTLY one of "SUV","Sedan","Hatchback","Pickup","Coupe","Van" (中大型SUV/紧凑型SUV → SUV; 轿车 → Sedan; MPV → Van).
- fuel: EXACTLY one of "Petrol","Diesel","Hybrid","Electric" (汽油 → Petrol; 柴油 → Diesel; 混动/插电混动/油电混合 → Hybrid; 纯电动 → Electric).
- transmission: EXACTLY one of "Automatic","Manual" (自动 → Automatic; 手动 → Manual; electric cars are Automatic).
- drivetrain: one of "FWD","RWD","AWD","4WD" or null (前置前驱 → FWD; 后置后驱 → RWD; 四驱/全时四驱 → AWD).
- seats: number of seats, or null.
- doors: number of doors, or null.
- cylinders: engine cylinder count, or null (null for electric).
- horsepower: peak power in hp/马力 as a number, or null.
- engineCapacity: a short English engine descriptor, or null. For combustion use e.g. "2.0L Turbo", "1.5L". For electric use "Electric" (optionally the battery, e.g. "Electric · 77 kWh").
- carRmb: the dealer's asking price in RMB yuan as a number (报价/¥X万 means ×10000; ¥5.50万 = 55000). null if not stated.

DESCRIPTION + FEATURES (for the public storefront):
- description: SHORT, 1–2 tight paragraphs. State year, make, model, trim, mileage and colour, then the standout equipment. NO filler, NO invented backstory.
- features: array of short English feature names actually supported by the text. In the English config sheet, "●" means fitted and "-" means NOT fitted — never list a "-" item. Dealer highlight tags are fitted. No duplicates.
- NEVER mention a Chinese city/province/region, the dealer's name, "China" as a sourcing detail, or a manufacturer suggested retail price. This is a reseller storefront — keep provenance out of the copy.

Respond with ONLY a JSON object with exactly these keys: make, model, trim, year, mileageKm, colour, bodyType, fuel, transmission, drivetrain, seats, doors, cylinders, horsepower, engineCapacity, carRmb, description, features.`;

export class DeepSeekImportError extends Error {}

export interface KnownFacts {
  carRmb?: number;
  mileageKm?: number;
  year?: number;
  make?: string;
  model?: string;
}

export async function extractListing(input: {
  cnText: string;
  enText?: string;
  known: KnownFacts;
}): Promise<ExtractedListing> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new DeepSeekImportError("DEEPSEEK_API_KEY is not configured on the server.");
  }

  const knownLines = [
    input.known.carRmb != null ? `- Asking price: ¥${input.known.carRmb} RMB` : null,
    input.known.mileageKm != null ? `- Mileage: ${input.known.mileageKm} km` : null,
    input.known.year != null ? `- Registration year: ${input.known.year}` : null,
    input.known.make ? `- Make (from breadcrumb): ${input.known.make}` : null,
    input.known.model ? `- Model (from breadcrumb): ${input.known.model}` : null,
  ].filter(Boolean);

  const userMessage = `KNOWN FACTS (already read from the page — honour these exactly):
${knownLines.length ? knownLines.join("\n") : "(none)"}

── CHINESE DEALER PAGE ──
${input.cnText.slice(0, 7000)}

${input.enText ? `── ENGLISH MIRROR + CONFIG SHEET ──\n${input.enText.slice(0, 7000)}` : "(English mirror unavailable — extract everything from the Chinese page above.)"}`;

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  }).catch((e) => {
    throw new DeepSeekImportError(`Could not reach DeepSeek: ${e.message}`);
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new DeepSeekImportError(`DeepSeek returned ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new DeepSeekImportError("DeepSeek returned an unexpected response shape.");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new DeepSeekImportError("DeepSeek did not return valid JSON.");
  }

  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const numOrU = (v: unknown): number | undefined =>
    typeof v === "number" && Number.isFinite(v) ? v : undefined;
  const enumOrU = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;

  const description = str(parsed.description);
  const features = parsed.features;
  if (!description) {
    throw new DeepSeekImportError("DeepSeek response was missing a description.");
  }
  if (!Array.isArray(features) || !features.every((f) => typeof f === "string")) {
    throw new DeepSeekImportError("DeepSeek response was missing a feature list.");
  }
  const make = str(parsed.make);
  const model = str(parsed.model);
  if (!make && !model) {
    throw new DeepSeekImportError("DeepSeek could not identify the make or model.");
  }

  return {
    make,
    model,
    trim: str(parsed.trim),
    year: numOrU(parsed.year),
    mileageKm: numOrU(parsed.mileageKm),
    colour: str(parsed.colour) || "Unspecified",
    bodyType: enumOrU(parsed.bodyType) as ExtractedListing["bodyType"],
    fuel: enumOrU(parsed.fuel) as ExtractedListing["fuel"],
    transmission: enumOrU(parsed.transmission) as ExtractedListing["transmission"],
    drivetrain: enumOrU(parsed.drivetrain) as ExtractedListing["drivetrain"],
    seats: numOrU(parsed.seats),
    doors: numOrU(parsed.doors),
    cylinders: numOrU(parsed.cylinders),
    horsepower: numOrU(parsed.horsepower),
    engineCapacity: enumOrU(parsed.engineCapacity),
    carRmb: numOrU(parsed.carRmb),
    description,
    features: features.map((f) => f.trim()).filter(Boolean),
  };
}
