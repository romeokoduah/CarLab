import type { Car } from "@/lib/types";

export type SortKey =
  | "featured"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "mileage-asc"
  | "year-desc";

export interface Filters {
  q: string;
  makes: string[];
  models: string[];
  bodyTypes: string[];
  fuels: string[];
  transmissions: string[];
  conditions: string[];
  colours: string[];
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
  priceMin?: number;
  priceMax?: number;
  sort: SortKey;
}

export const EMPTY_FILTERS: Filters = {
  q: "",
  makes: [],
  models: [],
  bodyTypes: [],
  fuels: [],
  transmissions: [],
  conditions: [],
  colours: [],
  // Browsing starts on a shuffled mix, not newest-first, so the whole
  // inventory gets seen rather than the latest few always sitting on top.
  sort: "featured",
};

const LIST_KEYS: (keyof Filters)[] = [
  "makes",
  "models",
  "bodyTypes",
  "fuels",
  "transmissions",
  "conditions",
  "colours",
];

/** Parse filters out of the URL query string (shareable / back-button safe). */
export function parseFilters(params: URLSearchParams): Filters {
  const getList = (k: string) =>
    params.get(k)?.split(",").filter(Boolean) ?? [];
  const getNum = (k: string) => {
    const v = params.get(k);
    return v != null && v !== "" ? Number(v) : undefined;
  };
  return {
    q: params.get("q") ?? "",
    makes: getList("makes"),
    models: getList("models"),
    bodyTypes: getList("body"),
    fuels: getList("fuel"),
    transmissions: getList("trans"),
    conditions: getList("cond"),
    colours: getList("colour"),
    yearMin: getNum("yearMin"),
    yearMax: getNum("yearMax"),
    mileageMax: getNum("mileageMax"),
    priceMin: getNum("priceMin"),
    priceMax: getNum("priceMax"),
    sort: (params.get("sort") as SortKey) || "featured",
  };
}

/** Serialize filters back into a compact query string. */
export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.makes.length) p.set("makes", f.makes.join(","));
  if (f.models.length) p.set("models", f.models.join(","));
  if (f.bodyTypes.length) p.set("body", f.bodyTypes.join(","));
  if (f.fuels.length) p.set("fuel", f.fuels.join(","));
  if (f.transmissions.length) p.set("trans", f.transmissions.join(","));
  if (f.conditions.length) p.set("cond", f.conditions.join(","));
  if (f.colours.length) p.set("colour", f.colours.join(","));
  if (f.yearMin != null) p.set("yearMin", String(f.yearMin));
  if (f.yearMax != null) p.set("yearMax", String(f.yearMax));
  if (f.mileageMax != null) p.set("mileageMax", String(f.mileageMax));
  if (f.priceMin != null) p.set("priceMin", String(f.priceMin));
  if (f.priceMax != null) p.set("priceMax", String(f.priceMax));
  if (f.sort && f.sort !== "featured") p.set("sort", f.sort);
  return p.toString();
}

export function countActiveFilters(f: Filters): number {
  let n = 0;
  for (const k of LIST_KEYS) n += (f[k] as string[]).length;
  if (f.yearMin != null || f.yearMax != null) n += 1;
  if (f.mileageMax != null) n += 1;
  if (f.priceMin != null || f.priceMax != null) n += 1;
  if (f.q) n += 1;
  return n;
}

/**
 * Lightweight natural-language parsing for the search box.
 * Understands things like "automatic SUV under 250k" or "diesel toyota".
 * Extracts structured hints, leaves the rest as free text.
 */
export function interpretQuery(q: string): Partial<Filters> & { text: string } {
  const lower = ` ${q.toLowerCase()} `;
  const out: Partial<Filters> & { text: string } = { text: q };

  const transMatch: string[] = [];
  if (/\bautomatic|\bauto\b/.test(lower)) transMatch.push("Automatic");
  if (/\bmanual\b|\bstick\b/.test(lower)) transMatch.push("Manual");
  if (transMatch.length) out.transmissions = transMatch;

  const fuels: string[] = [];
  if (/\bpetrol|\bgas\b/.test(lower)) fuels.push("Petrol");
  if (/\bdiesel\b/.test(lower)) fuels.push("Diesel");
  if (/\bhybrid\b/.test(lower)) fuels.push("Hybrid");
  if (/\belectric|\bev\b|\btesla\b/.test(lower)) fuels.push("Electric");
  if (fuels.length) out.fuels = fuels;

  const bodies: string[] = [];
  if (/\bsuv\b/.test(lower)) bodies.push("SUV");
  if (/\bsedan|\bsaloon\b/.test(lower)) bodies.push("Sedan");
  if (/\bhatch(back)?\b/.test(lower)) bodies.push("Hatchback");
  if (/\bpickup|\btruck\b|\bbakkie\b/.test(lower)) bodies.push("Pickup");
  if (/\bcoupe\b/.test(lower)) bodies.push("Coupe");
  if (/\bvan\b/.test(lower)) bodies.push("Van");
  if (bodies.length) out.bodyTypes = bodies;

  // "under 250k", "below 300000", "under 250,000"
  const priceMatch = lower.match(/(?:under|below|less than|max)\s*([\d,.]+)\s*(k|m)?/);
  if (priceMatch) {
    let val = Number(priceMatch[1].replace(/[,]/g, ""));
    if (priceMatch[2] === "k") val *= 1_000;
    if (priceMatch[2] === "m") val *= 1_000_000;
    if (!Number.isNaN(val) && val > 0) out.priceMax = val;
  }

  return out;
}

const MODEL_STOPWORDS = new Set([
  "automatic",
  "auto",
  "manual",
  "suv",
  "sedan",
  "saloon",
  "hatchback",
  "hatch",
  "pickup",
  "truck",
  "coupe",
  "van",
  "petrol",
  "diesel",
  "hybrid",
  "electric",
  "ev",
  "under",
  "below",
  "over",
  "above",
  "less",
  "than",
  "max",
  "cheap",
  "new",
  "used",
]);

/** Apply filters + free-text search, then sort. Pure. */
export function applyFilters(cars: Car[], f: Filters): Car[] {
  const nl = f.q ? interpretQuery(f.q) : null;

  const makes = f.makes;
  const models = f.models;
  const bodyTypes = uniqueMerge(f.bodyTypes, nl?.bodyTypes);
  const fuels = uniqueMerge(f.fuels, nl?.fuels);
  const transmissions = uniqueMerge(f.transmissions, nl?.transmissions);
  const priceMax = f.priceMax ?? nl?.priceMax;

  // leftover free-text tokens (after removing recognised keywords)
  const freeTokens = f.q
    ? f.q
        .toLowerCase()
        .replace(/(?:under|below|less than|max)\s*[\d,.]+\s*(k|m)?/g, "")
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 1 && !MODEL_STOPWORDS.has(t))
    : [];

  let result = cars.filter((c) => {
    if (makes.length && !makes.includes(c.make)) return false;
    if (models.length && !models.includes(c.model)) return false;
    if (bodyTypes.length && !bodyTypes.includes(c.bodyType)) return false;
    if (fuels.length && !fuels.includes(c.fuel)) return false;
    if (transmissions.length && !transmissions.includes(c.transmission))
      return false;
    if (f.conditions.length && !f.conditions.includes(c.condition)) return false;
    if (f.colours.length && !f.colours.includes(c.colour)) return false;
    if (f.yearMin != null && c.year < f.yearMin) return false;
    if (f.yearMax != null && c.year > f.yearMax) return false;
    if (f.mileageMax != null && c.mileageKm > f.mileageMax) return false;
    if (f.priceMin != null && c.priceGhs < f.priceMin) return false;
    if (priceMax != null && c.priceGhs > priceMax) return false;

    if (freeTokens.length) {
      const haystack =
        `${c.make} ${c.model} ${c.colour} ${c.bodyType} ${c.year}`.toLowerCase();
      const allMatch = freeTokens.every((t) => haystack.includes(t));
      if (!allMatch) return false;
    }
    return true;
  });

  result = sortCars(result, f.sort);
  return result;
}

function uniqueMerge(a: string[], b?: string[]): string[] {
  if (!b || !b.length) return a;
  return Array.from(new Set([...a, ...b]));
}

export function sortCars(cars: Car[], sort: SortKey): Car[] {
  const arr = [...cars];
  switch (sort) {
    case "price-asc":
      return arr.sort((a, b) => a.priceGhs - b.priceGhs);
    case "price-desc":
      return arr.sort((a, b) => b.priceGhs - a.priceGhs);
    case "mileage-asc":
      return arr.sort((a, b) => a.mileageKm - b.mileageKm);
    case "year-desc":
      return arr.sort((a, b) => b.year - a.year);
    case "newest":
      return arr.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case "featured":
    default:
      // Order is decided by the caller's seeded shuffle; leave it untouched.
      return arr;
  }
}

/**
 * Deterministic shuffle. Given the same seed and the same cars it always
 * produces the same order, so paginating and coming back never reshuffles the
 * list under the shopper — but a fresh seed (a new visit) mixes it up again.
 * Fisher–Yates driven by a small mulberry32 PRNG.
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed >>> 0;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Distinct values used to build filter options from live inventory. */
export function facetsFrom(cars: Car[]) {
  const distinct = (fn: (c: Car) => string) =>
    Array.from(new Set(cars.map(fn))).sort();
  const makeModels: Record<string, string[]> = {};
  for (const c of cars) {
    (makeModels[c.make] ||= []);
    if (!makeModels[c.make].includes(c.model)) makeModels[c.make].push(c.model);
  }
  return {
    makes: distinct((c) => c.make),
    bodyTypes: distinct((c) => c.bodyType),
    fuels: distinct((c) => c.fuel),
    transmissions: distinct((c) => c.transmission),
    conditions: distinct((c) => c.condition),
    colours: distinct((c) => c.colour),
    makeModels,
    yearMin: Math.min(...cars.map((c) => c.year)),
    yearMax: Math.max(...cars.map((c) => c.year)),
    priceMin: Math.min(...cars.map((c) => c.priceGhs)),
    priceMax: Math.max(...cars.map((c) => c.priceGhs)),
    mileageMax: Math.max(...cars.map((c) => c.mileageKm)),
  };
}
