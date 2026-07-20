import test from "node:test";
import assert from "node:assert/strict";
import {
  REFERENCE_ALPHABET,
  generateReference,
  normalizeReference,
} from "@/lib/reference";

const PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

test("alphabet excludes look-alike characters", () => {
  for (const ch of ["0", "O", "1", "I", "L"]) {
    assert.ok(
      !REFERENCE_ALPHABET.includes(ch),
      `${ch} must not be in the alphabet`,
    );
  }
});

test("generated references match XXXX-XXXX in the safe alphabet", () => {
  for (let i = 0; i < 200; i++) {
    assert.match(generateReference(), PATTERN);
  }
});

test("generated references vary", () => {
  const seen = new Set(Array.from({ length: 50 }, () => generateReference()));
  assert.ok(seen.size > 45, "expected generated references to be distinct");
});

test("normalize accepts lowercase, spacing and a missing dash", () => {
  assert.equal(normalizeReference("a7k29qmx"), "A7K2-9QMX");
  assert.equal(normalizeReference("A7K2-9QMX"), "A7K2-9QMX");
  assert.equal(normalizeReference("  a7k2 9qmx  "), "A7K2-9QMX");
  assert.equal(normalizeReference("a7k2–9qmx"), "A7K2-9QMX"); // en dash
});

test("normalize rejects wrong length or invalid characters", () => {
  assert.equal(normalizeReference("SHORT"), null);
  assert.equal(normalizeReference("A7K29QMXX"), null);
  assert.equal(normalizeReference("A0K2-9QMX"), null); // 0 not in alphabet
  assert.equal(normalizeReference("AIK2-9QMX"), null); // I not in alphabet
  assert.equal(normalizeReference(""), null);
});
