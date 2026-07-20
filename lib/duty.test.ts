import test from "node:test";
import assert from "node:assert/strict";
import { calculateDuty, DEFAULT_DUTY_CONFIG } from "@/lib/duty";

const cfg = DEFAULT_DUTY_CONFIG;
const base = { cif: 100_000, currentYear: 2026 };

test("petrol duty bands by engine capacity", () => {
  const cc = (engineCc: number) =>
    calculateDuty({ ...base, fuel: "Petrol", engineCc, yearOfManufacture: 2024 }, cfg)
      .dutyRate;
  assert.equal(cc(900), 5);
  assert.equal(cc(1000), 5);
  assert.equal(cc(1001), 10);
  assert.equal(cc(3000), 10);
  assert.equal(cc(3500), 20);
});

test("diesel duty bands by engine capacity", () => {
  const cc = (engineCc: number) =>
    calculateDuty({ ...base, fuel: "Diesel", engineCc, yearOfManufacture: 2024 }, cfg)
      .dutyRate;
  assert.equal(cc(1500), 5);
  assert.equal(cc(1501), 10);
  assert.equal(cc(2500), 10);
  assert.equal(cc(2600), 20);
});

test("overage penalty brackets by age", () => {
  const yr = (yearOfManufacture: number) =>
    calculateDuty(
      { ...base, fuel: "Petrol", engineCc: 2000, yearOfManufacture },
      cfg,
    ).overageRate;
  assert.equal(yr(2024), 0); // 2 years
  assert.equal(yr(2017), 0); // 9 years
  assert.equal(yr(2016), 12.5); // 10 years
  assert.equal(yr(2015), 12.5); // 11 years
  assert.equal(yr(2014), 20); // 12 years
  assert.equal(yr(2012), 20); // 14 years
  assert.equal(yr(2005), 20); // 21 years (capped)
});

test("full breakdown compounds in the documented order", () => {
  // CIF 100,000 GHS, petrol 2000cc (10% duty), 2022 car (no overage).
  //   duty 10,000 | ecowas 500 | au 200 | special 2,000 | processing 1,000
  //   exam 1,000  | nhil 2,750 | getfund 2,750 | covid 1,100 (on CIF+duty)
  //   vat 15% of (110,000 + 2,750 + 2,750 + 1,100 = 116,600) = 17,490
  //   total = 38,790
  const r = calculateDuty(
    { ...base, fuel: "Petrol", engineCc: 2000, yearOfManufacture: 2022 },
    cfg,
  );
  const amount = (label: string) =>
    r.lines.find((l) => l.label === label)?.amount;

  assert.equal(amount("Import Duty"), 10_000);
  assert.equal(amount("ECOWAS Levy"), 500);
  assert.equal(amount("AU Levy"), 200);
  assert.equal(amount("Special Import Levy"), 2_000);
  assert.equal(amount("Processing Fee"), 1_000);
  assert.equal(amount("Examination Fee"), 1_000);
  assert.equal(amount("NHIL"), 2_750);
  assert.equal(amount("GETFund Levy"), 2_750);
  assert.equal(amount("COVID-19 Levy"), 1_100);
  assert.equal(amount("VAT"), 17_490);
  assert.equal(r.total, 38_790);
});

test("overage penalty is charged on CIF and included in the total", () => {
  const r = calculateDuty(
    { ...base, fuel: "Petrol", engineCc: 2000, yearOfManufacture: 2014 },
    cfg,
  );
  const penalty = r.lines.find((l) => l.label === "Overage Penalty");
  assert.equal(penalty?.amount, 20_000); // 20% of 100,000
  assert.equal(r.total, 38_790 + 20_000);
});

test("zero or invalid CIF yields a zero result rather than NaN", () => {
  const r = calculateDuty(
    { cif: 0, currentYear: 2026, fuel: "Petrol", engineCc: 2000, yearOfManufacture: 2022 },
    cfg,
  );
  assert.equal(r.total, 0);
  assert.ok(r.lines.every((l) => Number.isFinite(l.amount)));
});
