import test from "node:test";
import assert from "node:assert/strict";
import {
  LOGISTICS_RMB,
  computeFinalPriceGhs,
  defaultsForBody,
  followsGlobalRates,
  hasBreakdown,
  previewReprice,
  type PriceableCar,
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

test("float noise does not push an exact hundred up to the next one", () => {
  // 95,500 × 2.2 evaluates to 210100.00000000003 in IEEE-754.
  const price = computeFinalPriceGhs({
    carRmb: 80000,
    logisticsRmb: 3500,
    profitRmb: 12000,
    shippingUsd: 1800,
    ghsPerRmb: 2.2,
    ghsPerUsd: 15,
  });
  assert.equal(price, 237100);
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

// ── Repricing ──────────────────────────────────────────────────────────────

/** A sedan priced at ¥2.00 / $15.00: (80,000+3,500+12,000)×2 + 1,800×15. */
function sedan(over: Partial<PriceableCar> = {}): PriceableCar {
  return {
    id: "car-1",
    make: "Toyota",
    model: "Camry",
    year: 2022,
    priceGhs: 218000,
    costCarRmb: 80000,
    costLogisticsRmb: 3500,
    costProfitRmb: 12000,
    costShippingUsd: 1800,
    rateGhsPerRmb: 2,
    rateGhsPerUsd: 15,
    ...over,
  };
}

test("a rate change reprices cars that follow the global rates", () => {
  const rows = previewReprice([sedan()], { ghsPerRmb: 2.2, ghsPerUsd: 15 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].oldPriceGhs, 218000);
  assert.equal(rows[0].newPriceGhs, 237100); // 95,500×2.2 + 27,000
  assert.equal(rows[0].label, "2022 Toyota Camry");
});

test("the USD rate moves the shipping line only", () => {
  const rows = previewReprice([sedan()], { ghsPerRmb: 2, ghsPerUsd: 16 });
  assert.equal(rows[0].newPriceGhs, 219800); // 191,000 + 1,800×16
});

test("pinned cars are left alone", () => {
  const pinned = sedan({ ratesPinned: true });
  assert.equal(followsGlobalRates(pinned), false);
  assert.deepEqual(previewReprice([pinned], { ghsPerRmb: 3, ghsPerUsd: 20 }), []);
});

test("hand-priced cars with no breakdown are left alone", () => {
  const legacy: PriceableCar = {
    id: "car-old",
    make: "Kia",
    model: "Rio",
    year: 2018,
    priceGhs: 90000,
  };
  assert.equal(followsGlobalRates(legacy), false);
  assert.deepEqual(previewReprice([legacy], { ghsPerRmb: 3, ghsPerUsd: 20 }), []);
});

test("unchanged prices are not reported as changes", () => {
  assert.deepEqual(previewReprice([sedan()], { ghsPerRmb: 2, ghsPerUsd: 15 }), []);
});

test("reprice reports only the cars that actually move", () => {
  const rows = previewReprice(
    [
      sedan({ id: "a" }),
      sedan({ id: "b", ratesPinned: true }),
      sedan({ id: "c", costCarRmb: undefined, priceGhs: 50000 }),
    ],
    { ghsPerRmb: 2.2, ghsPerUsd: 15 },
  );
  assert.deepEqual(rows.map((r) => r.id), ["a"]);
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
