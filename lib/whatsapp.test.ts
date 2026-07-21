import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGenericWhatsAppLink,
  formatWhatsAppNumber,
} from "@/lib/whatsapp";

test("Ghanaian numbers are grouped the way people write them", () => {
  assert.equal(formatWhatsAppNumber("233554981410"), "+233 55 498 1410");
  assert.equal(formatWhatsAppNumber("233274224535"), "+233 27 422 4535");
});

test("punctuation the admin typed is ignored", () => {
  assert.equal(formatWhatsAppNumber("+233 55 498 1410"), "+233 55 498 1410");
  assert.equal(formatWhatsAppNumber("+233-55-498-1410"), "+233 55 498 1410");
});

test("a non-Ghanaian number keeps its own shape rather than being mis-grouped", () => {
  assert.equal(formatWhatsAppNumber("447911123456"), "+447911123456");
});

test("an empty number formats to nothing, not a bare plus", () => {
  assert.equal(formatWhatsAppNumber(""), "");
  assert.equal(formatWhatsAppNumber("   "), "");
});

test("wa.me links carry digits only, whatever the stored formatting", () => {
  const href = buildGenericWhatsAppLink("+233 55 498 1410", "Eclipse Motors");
  assert.ok(
    href.startsWith("https://wa.me/233554981410?text="),
    `unexpected href: ${href}`,
  );
});
