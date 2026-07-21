/**
 * Turns a scraped listing's confirmed spec text into the two fields that
 * actually need judgment rather than parsing: the sales description and the
 * feature checklist. Every other field (price, year, mileage, engine…) is
 * parsed deterministically in lib/import/che168.ts and never touches the AI.
 *
 * The model is given ONLY the confirmed "●" config-sheet rows and translated
 * dealer highlight tags for THIS listing — never other listings, never the
 * trim in general — and is told to skip anything it can't ground in that
 * text. This mirrors how these imports were done by hand: read what's
 * actually confirmed, write it up briefly, never pad the feature list.
 */

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

const SYSTEM_PROMPT = `You write short vehicle listing copy for a Ghana-based used-car reseller's website from scraped Chinese used-car marketplace data (che168.com).

STRICT RULES:
1. Use ONLY facts present in the "CONFIRMED SPEC TEXT" you're given below. In that text, "●" marks a feature that IS fitted; "-" marks one that is NOT fitted. Dealer highlight tags are also confirmed-fitted. Never include a feature you cannot point to in that text.
2. This is a specific, individual vehicle listing — not a trim description in general. Two cars of the identical trim can carry different confirmed features if their source pages differ. Only report what THIS listing's text confirms.
3. NEVER mention a Chinese city, province, or region, the dealer's name, "China" as a sourcing detail, or a manufacturer suggested retail price. This is a reseller storefront, not a sourcing narrative — keep provenance out of the copy entirely.
4. The description must be SHORT: 1–2 tight paragraphs. State the year, make, model, trim, mileage, and colour, then briefly name the standout confirmed equipment. No filler adjectives, no invented backstory.
5. The feature list is an array of short English feature names (e.g. "Blind-spot monitor", "12.3-inch touchscreen"). Prefer plain, buyer-facing names. No duplicates.
6. If nothing at all is confirmed for a category, simply omit it — do not guess a plausible default.

Respond with ONLY a JSON object: { "description": string, "features": string[] }.`;

export interface CopyDraft {
  description: string;
  features: string[];
}

export class DeepSeekImportError extends Error {}

export async function extractListingCopy(input: {
  make: string;
  model: string;
  trim: string;
  year: number;
  mileageKm: number;
  colour: string;
  previousOwners: number;
  specContext: string;
}): Promise<CopyDraft> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new DeepSeekImportError("DEEPSEEK_API_KEY is not configured on the server.");
  }

  const userMessage = `Vehicle: ${input.year} ${input.make} ${input.model} ${input.trim}
Mileage: ${input.mileageKm.toLocaleString()} km
Colour: ${input.colour}
Previous owners: ${input.previousOwners}

CONFIRMED SPEC TEXT (from the source listing — "●" = fitted, "-" = not fitted):
${input.specContext || "(none captured)"}`;

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(45000),
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

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new DeepSeekImportError("DeepSeek did not return valid JSON.");
  }

  const description = (parsed as Record<string, unknown>)?.description;
  const features = (parsed as Record<string, unknown>)?.features;
  if (typeof description !== "string" || !description.trim()) {
    throw new DeepSeekImportError("DeepSeek response was missing a description.");
  }
  if (!Array.isArray(features) || !features.every((f) => typeof f === "string")) {
    throw new DeepSeekImportError("DeepSeek response was missing a feature list.");
  }

  return {
    description: description.trim(),
    features: [...new Set(features.map((f) => f.trim()).filter(Boolean))],
  };
}
