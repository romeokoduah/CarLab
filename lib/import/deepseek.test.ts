import { test } from "node:test";
import assert from "node:assert/strict";
import { DeepSeekImportError, parseExtraction } from "@/lib/import/deepseek";

const RECORD = {
  make: "Changan",
  model: "UNI-K",
  trim: "Premium",
  year: 2021,
  mileageKm: 67900,
  colour: "White",
  bodyType: "SUV",
  fuel: "Petrol",
  transmission: "Automatic",
  drivetrain: "FWD",
  seats: 5,
  doors: 5,
  cylinders: 4,
  horsepower: 233,
  engineCapacity: "2.0L Turbo",
  carRmb: 63500,
  description: "2021 Changan UNI-K Premium, 67,900 km, white.",
  features: ["Keyless entry", "Panoramic sunroof"],
};

test("the shape the prompt asks for parses as-is", () => {
  const got = parseExtraction(JSON.stringify(RECORD));
  assert.equal(got.make, "Changan");
  assert.equal(got.carRmb, 63500);
  assert.equal(got.description, RECORD.description);
  assert.deepEqual(got.features, RECORD.features);
});

test("a record wrapped in a single key is unwrapped, not reported as missing a description", () => {
  const got = parseExtraction(JSON.stringify({ vehicle: RECORD }));
  assert.equal(got.model, "UNI-K");
  assert.equal(got.description, RECORD.description);
});

test("a description split into paragraphs is joined", () => {
  const got = parseExtraction(
    JSON.stringify({ ...RECORD, description: ["First paragraph.", " Second paragraph. "] }),
  );
  assert.equal(got.description, "First paragraph.\n\nSecond paragraph.");
});

test("a missing or null description is empty, not a failed import", () => {
  const { description: _omit, ...noDescription } = RECORD;
  assert.equal(parseExtraction(JSON.stringify(noDescription)).description, "");
  assert.equal(parseExtraction(JSON.stringify({ ...RECORD, description: null })).description, "");
});

test("key casing from the model is forgiven", () => {
  const got = parseExtraction(
    JSON.stringify({ Make: "Changan", Model: "UNI-K", Description: "Clean car.", Features: [] }),
  );
  assert.equal(got.make, "Changan");
  assert.equal(got.description, "Clean car.");
});

test("features sent as one delimited string are split, and a missing list is empty", () => {
  const got = parseExtraction(
    JSON.stringify({ ...RECORD, features: "• Keyless entry\n● Sunroof;360° camera" }),
  );
  assert.deepEqual(got.features, ["Keyless entry", "Sunroof", "360° camera"]);
  const { features: _omit, ...noFeatures } = RECORD;
  assert.deepEqual(parseExtraction(JSON.stringify(noFeatures)).features, []);
});

test("a reply with no make and no model is still a hard error", () => {
  assert.throws(
    () => parseExtraction(JSON.stringify({ ...RECORD, make: "", model: null })),
    DeepSeekImportError,
  );
});

test("non-JSON and non-record replies are errors", () => {
  assert.throws(() => parseExtraction("not json"), DeepSeekImportError);
  assert.throws(() => parseExtraction(JSON.stringify(["a", "b"])), DeepSeekImportError);
  assert.throws(() => parseExtraction(JSON.stringify({ note: "no listing here" })), DeepSeekImportError);
});
