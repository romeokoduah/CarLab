import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildSpecGroups, specTermsToTranslate } from "@/lib/import/che168-specs";
import type { ListingFeeds } from "@/lib/import/che168-api";
import { normalizeSpecs } from "@/lib/specs";

/** The captured feeds for infoid 58237870 (see che168-api.test.ts). */
const FEEDS: ListingFeeds = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures", "che168-feeds-58237870.json"), "utf8"),
);
const ID = "58237870";

/** A spec sheet with the given rows, in che168's feed shape. */
function sheet(rows: Record<string, string>): ListingFeeds {
  return {
    paramtypeitems: JSON.stringify({
      returncode: 0,
      result: [{ title: "基本参数", data: Object.entries(rows).map(([name, content]) => ({ name, content })) }],
    }),
  };
}

const value = (groups: ReturnType<typeof buildSpecGroups>, label: string) =>
  groups.flatMap((g) => g.rows).find((r) => r.label === label)?.value;

test("the captured sheet becomes English sections with literal figures", () => {
  const groups = buildSpecGroups(FEEDS, ID);
  assert.deepEqual(
    groups.map((g) => g.title),
    ["Engine & performance", "Transmission & drivetrain", "Chassis, steering & brakes", "Wheels & tyres", "Dimensions & weight"],
  );
  assert.equal(value(groups, "Displacement"), "1,497 cc");
  assert.equal(value(groups, "Cylinders"), "Inline 4");
  assert.equal(value(groups, "Max power"), "115 PS (84.4 kW) at 6,300 rpm");
  assert.equal(value(groups, "Max torque"), "143.8 N·m at 4,500 rpm");
  assert.equal(value(groups, "Fuel economy (WLTC)"), "6.05 L/100 km");
  assert.equal(value(groups, "Front suspension"), "MacPherson strut, independent");
  assert.equal(value(groups, "Tyres"), "215/60 R17");
  assert.equal(value(groups, "Length × width × height"), "4,385 × 1,800 × 1,650 mm");
  assert.equal(value(groups, "Wheelbase"), "2,630 mm");
  assert.equal(value(groups, "Approach angle"), "17°");
  // The glossary covers every text value on this car — nothing goes to the AI.
  assert.deepEqual(specTermsToTranslate(FEEDS, ID), []);
});

test("nothing on the sheet reveals where the car is sourced, and nothing is left in Chinese", () => {
  const text = JSON.stringify(buildSpecGroups(FEEDS, ID));
  assert.ok(!/China|国VI/.test(text), text);
  assert.ok(!/[一-鿿]/.test(text), text);
});

test("an unknown term goes to the AI, and its row appears only once translated", () => {
  const feeds = sheet({ 前悬架类型: "空气悬架", "轴距(mm)": "2800" });
  assert.deepEqual(specTermsToTranslate(feeds, ID), ["空气悬架"]);
  assert.equal(value(buildSpecGroups(feeds, ID), "Front suspension"), undefined);
  assert.equal(value(buildSpecGroups(feeds, ID, { 空气悬架: "Air suspension" }), "Front suspension"), "Air suspension");
  // A "translation" still in Chinese, or an essay, is not shown.
  assert.equal(value(buildSpecGroups(feeds, ID, { 空气悬架: "空气" }), "Front suspension"), undefined);
  assert.equal(value(buildSpecGroups(feeds, ID, { 空气悬架: "x".repeat(80) }), "Front suspension"), undefined);
  assert.equal(value(buildSpecGroups(feeds, ID), "Wheelbase"), "2,800 mm");
});

test("electric cars get their motor, battery and range", () => {
  const groups = buildSpecGroups(
    sheet({
      "电动机总功率(kW)": "200",
      "电池能量(kWh)": "77",
      "CLTC纯电续航里程(km)": "610",
      电池类型: "磷酸铁锂电池",
    }),
    ID,
  );
  assert.equal(value(groups, "Motor power"), "200 kW");
  assert.equal(value(groups, "Battery capacity"), "77 kWh");
  assert.equal(value(groups, "Range (CLTC)"), "610 km");
  assert.equal(value(groups, "Battery type"), "Lithium iron phosphate (LFP)");
});

test("a car without a captured sheet has no full specifications", () => {
  assert.deepEqual(buildSpecGroups({}, ID), []);
});

test("normalizeSpecs keeps only titled groups of text rows, bounded", () => {
  assert.deepEqual(normalizeSpecs(null), []);
  assert.deepEqual(normalizeSpecs("nope"), []);
  assert.deepEqual(
    normalizeSpecs([
      { title: "  Engine ", rows: [{ label: "Power", value: " 115 PS " }, { label: "", value: "x" }, { label: "Torque", value: "" }, { label: "power", value: "dup" }] },
      { title: "", rows: [{ label: "a", value: "b" }] },
      { title: "Empty", rows: [] },
      { title: "Odd", rows: [{ label: 5, value: {} }] },
      "junk",
    ]),
    [{ title: "Engine", rows: [{ label: "Power", value: "115 PS" }] }],
  );
  const big = normalizeSpecs([{ title: "T", rows: Array.from({ length: 100 }, (_, i) => ({ label: `L${i}`, value: "v".repeat(500) })) }]);
  assert.equal(big[0].rows.length, 40);
  assert.equal(big[0].rows[0].value.length, 200);
});
