import { test } from "node:test";
import assert from "node:assert/strict";
import {
  amountInWords,
  formatReceiptNo,
  nextReceiptNo,
  parseReceiptNo,
  receiptTotals,
  validateAmounts,
} from "@/lib/receipt";

// ── Numbering ──────────────────────────────────────────────────────────────

test("receipt numbers are zero-padded and carry the year", () => {
  assert.equal(formatReceiptNo(2026, 1), "EM-2026-0001");
  assert.equal(formatReceiptNo(2026, 42), "EM-2026-0042");
  // Past 9999 it simply gets longer rather than wrapping or truncating.
  assert.equal(formatReceiptNo(2026, 12345), "EM-2026-12345");
});

test("a receipt number round-trips", () => {
  assert.deepEqual(parseReceiptNo("EM-2026-0042"), { year: 2026, sequence: 42 });
  assert.equal(parseReceiptNo("INV-2026-0001"), null);
  assert.equal(parseReceiptNo("EM-2026-1"), null);
  assert.equal(parseReceiptNo(""), null);
});

test("numbering continues from the highest issued that year", () => {
  const issued = ["EM-2026-0001", "EM-2026-0003", "EM-2026-0002"];
  assert.equal(nextReceiptNo(2026, issued), "EM-2026-0004");
});

test("numbering restarts each year and ignores other years", () => {
  const issued = ["EM-2025-0117", "EM-2025-0118"];
  assert.equal(nextReceiptNo(2026, issued), "EM-2026-0001");
  assert.equal(nextReceiptNo(2025, issued), "EM-2025-0119");
});

test("unparseable numbers never derail the next one", () => {
  assert.equal(nextReceiptNo(2026, ["", "junk", "EM-2026-0007"]), "EM-2026-0008");
  assert.equal(nextReceiptNo(2026, []), "EM-2026-0001");
});

// ── Money ──────────────────────────────────────────────────────────────────

test("a part payment leaves the balance outstanding", () => {
  const t = receiptTotals({ priceGhs: 150000, amountPaidGhs: 50000 });
  assert.equal(t.balanceGhs, 100000);
  assert.equal(t.fullySettled, false);
});

test("paying in full settles the receipt", () => {
  const t = receiptTotals({ priceGhs: 150000, amountPaidGhs: 150000 });
  assert.equal(t.balanceGhs, 0);
  assert.equal(t.fullySettled, true);
});

test("an overpayment settles but never shows a negative balance", () => {
  const t = receiptTotals({ priceGhs: 150000, amountPaidGhs: 160000 });
  assert.equal(t.balanceGhs, 0);
  assert.equal(t.fullySettled, true);
});

test("amounts are held as whole cedis, so no float dust reaches a receipt", () => {
  const t = receiptTotals({ priceGhs: 150000.4, amountPaidGhs: 49999.6 });
  assert.equal(t.priceGhs, 150000);
  assert.equal(t.amountPaidGhs, 50000);
  assert.equal(t.balanceGhs, 100000);
});

test("missing or nonsensical amounts are rejected before they are written", () => {
  assert.ok(validateAmounts({ priceGhs: 0, amountPaidGhs: 100 }));
  assert.ok(validateAmounts({ priceGhs: 100, amountPaidGhs: 0 }));
  assert.ok(validateAmounts({ priceGhs: NaN, amountPaidGhs: 100 }));
  assert.ok(validateAmounts({ priceGhs: -5, amountPaidGhs: 100 }));
  assert.equal(validateAmounts({ priceGhs: 150000, amountPaidGhs: 50000 }), null);
});

// ── Amount in words ────────────────────────────────────────────────────────

test("the amount is written out the way a receipt states it", () => {
  assert.equal(amountInWords(0), "Zero cedis only");
  assert.equal(amountInWords(1), "One cedis only");
  assert.equal(amountInWords(15), "Fifteen cedis only");
  assert.equal(amountInWords(42), "Forty-two cedis only");
  assert.equal(amountInWords(100), "One hundred cedis only");
  assert.equal(amountInWords(115), "One hundred and fifteen cedis only");
  assert.equal(
    amountInWords(150000),
    "One hundred and fifty thousand cedis only",
  );
  assert.equal(
    amountInWords(189500),
    "One hundred and eighty-nine thousand five hundred cedis only",
  );
  assert.equal(amountInWords(1_000_000), "One million cedis only");
});
