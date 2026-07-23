import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanModel,
  mapBodyType,
  mapDrivetrain,
  mapFuel,
  mapTransmission,
  parseCnMileage,
  parseCnPrice,
  parseCnTransfers,
  parseCnYear,
  parseMakeModelTrim,
  parseSrcId,
  reconcileListing,
  splitModelName,
  type DeterministicFacts,
  type ExtractedListing,
} from "@/lib/import/che168-parse";

/**
 * Fixtures are trimmed copies of real scraped page text. The breadcrumb block
 * and the "Model Name"/"Manufacturer" fields are reproduced verbatim, because
 * the disagreement between them is the whole point of these tests.
 */
function enPage(opts: {
  brand: string;
  series: string;
  modelName: string;
  manufacturer: string;
}): string {
  return [
    "Find Items",
    "Used Cars",
    "How to Buy",
    "EN",
    "Home",
    "/",
    "Used Cars",
    "/",
    opts.brand,
    "/",
    `${opts.brand} ${opts.series}`,
    "/",
    `${opts.brand} ${opts.modelName}`,
    "Price",
    "$10,040",
    "Model Name",
    opts.modelName,
    "Manufacturer Suggested Retail Price (¥)",
    "¥153,900",
    "Manufacturer",
    opts.manufacturer,
    "Class",
    "Mid-size SUV",
  ].join("\n");
}

// ── The sub-brand bug that shipped ─────────────────────────────────────────

test("a sub-brand takes its own name, not the parent company's", () => {
  // che168 lists Jetour's manufacturer as "Chery Automobile" — the parent.
  const head = enPage({
    brand: "Jetour",
    series: "X70 PLUS",
    modelName: "Jetour X70 PLUS 2021 1.6T DCT Morning 7-Seater",
    manufacturer: "Chery Automobile",
  });
  const got = parseMakeModelTrim(head);
  assert.equal(got.make, "Jetour");
  assert.equal(got.model, "X70 PLUS");
  assert.equal(got.trim, "1.6T DCT Morning 7-Seater");
});

test("regression: the model is never sliced by the brand's character count", () => {
  // The old code did modelName.slice(make.length), so a 5-letter parent
  // ("Chery") against a 6-letter brand ("Jetour") produced "r X70 PLUS".
  const { model } = splitModelName("Jetour X70 PLUS 2021 1.6T DCT", "Chery");
  assert.ok(!model.startsWith("r "), `model was mangled: ${model}`);
  assert.equal(model, "Jetour X70 PLUS");
});

test("regression: a short brand does not eat into the model name", () => {
  // "BYD" (3) against "Song PLUS" produced "g PLUS" the same way.
  const { model } = splitModelName("BYD Song PLUS 2022 1.5T", "BYD");
  assert.equal(model, "Song PLUS");
});

// ── Ordinary brands still resolve ──────────────────────────────────────────

test("a brand that matches its manufacturer is unaffected", () => {
  const head = enPage({
    brand: "Changan",
    series: "UNI-K",
    modelName: "Changan UNI-K 2021 2.0T Excellence",
    manufacturer: "Changan Automobile",
  });
  const got = parseMakeModelTrim(head);
  assert.equal(got.make, "Changan");
  assert.equal(got.model, "UNI-K");
  assert.equal(got.trim, "2.0T Excellence");
});

test("the breadcrumb's spacing wins over the run-together Model Name", () => {
  // Breadcrumb says "CS75 PLUS"; the Model Name field says "CS75PLUS".
  const head = enPage({
    brand: "Changan",
    series: "CS75 PLUS",
    modelName: "Changan CS75PLUS 2020 1.5T Automatic Luxury",
    manufacturer: "Changan Automobile",
  });
  const got = parseMakeModelTrim(head);
  assert.equal(got.model, "CS75 PLUS");
  // "Automatic" is a transmission, not part of the trim name.
  assert.equal(got.trim, "1.5T Luxury");
});

test("make casing is normalised onto the catalog's spelling", () => {
  const head = enPage({
    brand: "JETOUR",
    series: "X70 PLUS",
    modelName: "JETOUR X70 PLUS 2021 1.6T",
    manufacturer: "Chery Automobile",
  });
  assert.equal(parseMakeModelTrim(head).make, "Jetour");
});

test("an unknown make is passed through rather than dropped", () => {
  const head = enPage({
    brand: "Livan",
    series: "X6 Pro",
    modelName: "Livan X6 Pro 2023 1.5T Comfort",
    manufacturer: "Geely Automobile",
  });
  const got = parseMakeModelTrim(head);
  assert.equal(got.make, "Livan");
  assert.equal(got.model, "X6 Pro");
});

test("falls back to the Model Name's first word when the breadcrumb is missing", () => {
  const head = [
    "Model Name",
    "Jetour X70 PLUS 2021 1.6T DCT Morning 7-Seater",
    "Manufacturer",
    "Chery Automobile",
  ].join("\n");
  const got = parseMakeModelTrim(head);
  assert.equal(got.make, "Jetour");
  assert.equal(got.model, "X70 PLUS");
});

test("cleanModel only splits a run-together suffix after a digit", () => {
  assert.equal(cleanModel("CS75PLUS"), "CS75 PLUS");
  assert.equal(cleanModel("CS75 PLUS"), "CS75 PLUS");
  assert.equal(cleanModel("UNI-K"), "UNI-K");
  // A word ending in "plus" must not be split apart.
  assert.equal(cleanModel("Surplus"), "Surplus");
});

// ── The Chinese page's own fields ──────────────────────────────────────────

test("prices in 万 are expanded to whole yuan", () => {
  assert.equal(parseCnPrice("报价：¥6.66万"), 66600);
  assert.equal(parseCnPrice("¥4.10万"), 41000);
  assert.equal(parseCnPrice("¥38,900"), 38900);
});

test("an unreadable price is an error, never a zero", () => {
  assert.throws(() => parseCnPrice("price on application"));
});

test("mileage in 万公里 is expanded, and transfers default to zero", () => {
  assert.equal(parseCnMileage("表显里程10.91万公里"), 109100);
  assert.equal(parseCnMileage("表显里程8000公里"), 8000);
  assert.equal(parseCnMileage("no mileage here"), undefined);
  assert.equal(parseCnTransfers("过户次数1次（以车辆登记证为准）"), 1);
  assert.equal(parseCnTransfers("过户次数0次"), 0);
  assert.equal(parseCnTransfers("not stated"), 0);
});

// ── Enum mapping ───────────────────────────────────────────────────────────

test("fuel, transmission, drivetrain and body map onto our unions", () => {
  assert.equal(mapFuel("Gasoline"), "Petrol");
  assert.equal(mapFuel("Diesel"), "Diesel");
  assert.equal(mapFuel("Plug-in Hybrid"), "Hybrid");
  assert.equal(mapFuel("Pure Electric"), "Electric");

  assert.equal(mapTransmission("8-speed automatic with manual shift mode"), "Automatic");
  assert.equal(mapTransmission("6-speed Manual Transmission (MT)"), "Manual");

  assert.equal(mapDrivetrain("Front-Wheel Drive (FWD)"), "FWD");
  assert.equal(mapDrivetrain("All-Wheel Drive"), "AWD");
  assert.equal(mapDrivetrain("unspecified"), undefined);

  assert.equal(mapBodyType("SUV", "Mid-size SUV"), "SUV");
  assert.equal(mapBodyType("Sedan", "Compact Sedan"), "Sedan");
  assert.equal(mapBodyType("", "MPV"), "Van");
  // Unknown shapes fall back to SUV, the overwhelmingly common import.
  assert.equal(mapBodyType("", ""), "SUV");
});

test("registration year is read from the Chinese archive", () => {
  assert.equal(parseCnYear("上牌时间2023年10月"), 2023);
  assert.equal(parseCnYear("上牌时间 2021年01月"), 2021);
  assert.equal(parseCnYear("no date"), undefined);
});

// ── URL id extraction across che168 link shapes ─────────────────────────────

test("the car id is pulled from every che168 link shape", () => {
  assert.equal(
    parseSrcId("https://www.che168.com/dealer/676896/59072492.html?pvareaid=100519#pos=1"),
    "59072492",
  );
  assert.equal(
    parseSrcId("https://www.che168.com/shanghai/59072492.html"),
    "59072492",
  );
  assert.equal(
    parseSrcId("https://global.che168.com/en/detail/59072492?fromsource=x"),
    "59072492",
  );
  // Dealer id in the path must not be mistaken for the car id.
  assert.equal(
    parseSrcId("https://www.che168.com/dealer/539175/59044612.html"),
    "59044612",
  );
  assert.equal(parseSrcId("not a url"), null);
  assert.equal(parseSrcId("https://www.che168.com/"), null);
});

// ── Reconciling deterministic reads with the AI extraction ──────────────────

const AI_FULL: ExtractedListing = {
  make: "Rising Auto",
  model: "R7",
  trim: "Advanced",
  year: 2024,
  mileageKm: 31000,
  colour: "White",
  bodyType: "SUV",
  fuel: "Electric",
  transmission: "Automatic",
  drivetrain: "RWD",
  seats: 5,
  doors: 5,
  cylinders: undefined,
  horsepower: 340,
  engineCapacity: "Electric · 77 kWh",
  carRmb: 55000,
  description: "2024 Rising Auto R7 Advanced, 30,000 km, white.",
  features: ["Panoramic roof", "360° camera", "Panoramic roof"],
};

test("the literal price and mileage win over the AI's numbers", () => {
  const det: DeterministicFacts = {
    carRmb: 55000,
    mileageKm: 30000, // CN 表显里程3万公里 = 30000, AI guessed 31000
    year: 2023, // CN 上牌时间2023年, AI said 2024
    previousOwners: 0,
  };
  const r = reconcileListing(det, AI_FULL);
  assert.equal(r.carRmb, 55000);
  assert.equal(r.mileageKm, 30000);
  assert.equal(r.year, 2023);
});

test("the AI fills make/model/colour when the English mirror was dead", () => {
  // No breadcrumb make/model/colour — mirror was sold.
  const det: DeterministicFacts = {
    carRmb: 55000,
    mileageKm: 30000,
    year: 2023,
    previousOwners: 0,
  };
  const r = reconcileListing(det, AI_FULL);
  assert.equal(r.make, "Rising Auto");
  assert.equal(r.model, "R7");
  assert.equal(r.colour, "White");
  assert.equal(r.fuel, "Electric");
  assert.equal(r.drivetrain, "RWD");
  assert.equal(r.horsepower, 340);
  // Features are de-duplicated.
  assert.deepEqual(r.features, ["Panoramic roof", "360° camera"]);
});

test("the breadcrumb make/model is preferred over the AI's when present", () => {
  const det: DeterministicFacts = {
    carRmb: 66600,
    mileageKm: 47800,
    year: 2021,
    previousOwners: 0,
    make: "Changan",
    model: "UNI-K",
    trim: "2.0T Excellence",
    colour: "White",
  };
  const ai: ExtractedListing = { ...AI_FULL, make: "Changan Auto", model: "UNIK" };
  const r = reconcileListing(det, ai);
  assert.equal(r.make, "Changan");
  assert.equal(r.model, "UNI-K");
  assert.equal(r.trim, "2.0T Excellence");
});

test("a price readable by neither is a hard error, never a zero", () => {
  const det: DeterministicFacts = { mileageKm: 30000, previousOwners: 0 };
  const ai: ExtractedListing = { ...AI_FULL, carRmb: undefined };
  assert.throws(() => reconcileListing(det, ai));
});

test("invalid AI enums fall back to safe defaults rather than corrupting a field", () => {
  const det: DeterministicFacts = { carRmb: 55000, mileageKm: 30000, previousOwners: 0 };
  const ai: ExtractedListing = {
    ...AI_FULL,
    bodyType: "Crossover" as ExtractedListing["bodyType"],
    fuel: "EV" as ExtractedListing["fuel"],
    transmission: "DCT" as ExtractedListing["transmission"],
    drivetrain: "2WD" as ExtractedListing["drivetrain"],
  };
  const r = reconcileListing(det, ai);
  assert.equal(r.bodyType, "SUV");
  assert.equal(r.fuel, "Petrol");
  assert.equal(r.transmission, "Automatic");
  assert.equal(r.drivetrain, undefined);
});
