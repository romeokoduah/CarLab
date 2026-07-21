import test from "node:test";
import assert from "node:assert/strict";
import {
  LOGISTICS_RMB,
  computeFinalPriceGhs,
  defaultsForBody,
  hasBreakdown,
} from "@/lib/pricing";

test("sedans use the small-vehicle margin and shipping", () => {
  assert.deepEqual(defaultsForBody("Sedan"), {
    profitRmb: 12000,
    shippingUsd: 1800,
  });
});

test("every non-sedan body uses the SUV margin and shipping", () => {
  for (const body of ["SUV", "Hatchback", "Pickup", "Coupe", "Van"] as const) {
    assert.deepEqual(
      defaultsForBody(body),
      { profitRmb: 16000, shippingUsd: 2300 },
      `${body} should use the SUV rate`,
    );
  }
});

test("logistics is a flat ¥3,500 on every vehicle", () => {
  assert.equal(LOGISTICS_RMB, 3500);
});

test("sedan worked example", () => {
  // (80,000 + 3,500 + 12,000) × 2 = 191,000 ; 1,800 × 15 = 27,000
  const price = computeFinalPriceGhs({
    carRmb: 80000,
    logisticsRmb: 3500,
    profitRmb: 12000,
    shippingUsd: 1800,
    ghsPerRmb: 2,
    ghsPerUsd: 15,
  });
  assert.equal(price, 218000);
});

test("SUV worked example", () => {
  // (120,000 + 3,500 + 16,000) × 2 = 279,000 ; 2,300 × 15 = 34,500
  const price = computeFinalPriceGhs({
    carRmb: 120000,
    logisticsRmb: 3500,
    profitRmb: 16000,
    shippingUsd: 2300,
    ghsPerRmb: 2,
    ghsPerUsd: 15,
  });
  assert.equal(price, 313500);
});

test("prices round up to the nearest hundred cedis", () => {
  const price = computeFinalPriceGhs({
    carRmb: 1000,
    logisticsRmb: 0,
    profitRmb: 0,
    shippingUsd: 0,
    ghsPerRmb: 2.031,
    ghsPerUsd: 15,
  });
  assert.equal(price, 2100); // 2,031 → 2,100
});

test("missing car price yields no computed price", () => {
  assert.equal(
    computeFinalPriceGhs({ ghsPerRmb: 2, ghsPerUsd: 15 }),
    undefined,
  );
  assert.equal(hasBreakdown({ ghsPerRmb: 2 }), false);
});

test("a missing exchange rate yields no computed price", () => {
  const base = { carRmb: 80000, logisticsRmb: 3500, profitRmb: 12000 };
  assert.equal(computeFinalPriceGhs({ ...base, ghsPerUsd: 15 }), undefined);
  assert.equal(computeFinalPriceGhs({ ...base, ghsPerRmb: 2 }), undefined);
});

test("optional lines default to zero rather than blocking the price", () => {
  const price = computeFinalPriceGhs({
    carRmb: 10000,
    ghsPerRmb: 2,
    ghsPerUsd: 15,
  });
  assert.equal(price, 20000);
  assert.equal(hasBreakdown({ carRmb: 10000 }), true);
});
