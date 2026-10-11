import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  carInfoText,
  feedFacts,
  feedForUrl,
  specSheetText,
  type ListingFeeds,
} from "@/lib/import/che168-api";
import { decodePagePayload, encodePagePayload } from "@/lib/import/page-payload";

/**
 * The three feeds as che168's mobile page received them for infoid 58237870
 * (2026-10-11, a 2026 Kia Seltos 1.5L IVT). The car record is cut down to the
 * fields the importer reads — no VIN, dealer or location.
 */
const FEEDS: ListingFeeds = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures", "che168-feeds-58237870.json"), "utf8"),
);
const ID = "58237870";

test("each feed is recognised by its path, never by a look-alike endpoint", () => {
  const api = "https://apiuscdt.che168.com";
  assert.equal(feedForUrl(`${api}/api/v1/car/getparamtypeitems?infoid=1&_sign=x`), "paramtypeitems");
  assert.equal(feedForUrl(`${api}/apic/v3/car/getcarinfo?infoid=1`), "carinfo");
  assert.equal(feedForUrl(`${api}/apic/v2/car/getcarinfoext?infoid=1`), "carinfoext");
  assert.equal(feedForUrl(`${api}/apic/v2/car/getactivecarinfo?infoid=1`), null);
  assert.equal(feedForUrl(`${api}/apic/v4/car/getcarextinfo?infoid=1`), null);
  assert.equal(feedForUrl("not a url"), null);
});

test("the spec sheet's hard facts are read literally", () => {
  assert.deepEqual(feedFacts(FEEDS, ID), {
    carRmb: 100000,
    mileageKm: 100,
    year: 2026,
    previousOwners: 0,
    seats: 5,
    doors: 5,
    fuel: "Petrol",
    cylinders: 4,
    engineCapacity: "1.5L",
    horsepower: 115,
    transmission: "Automatic",
    drivetrain: "FWD",
  });
});

test("a feed about a different listing is ignored", () => {
  const facts = feedFacts(FEEDS, "11111111");
  assert.equal(facts.carRmb, undefined);
  assert.equal(facts.year, undefined);
  assert.equal(carInfoText(FEEDS, "11111111"), "");
});

test("missing or broken feeds give nothing rather than throwing", () => {
  assert.deepEqual(feedFacts({}, ID), {});
  assert.deepEqual(feedFacts({ paramtypeitems: "<html>", carinfo: "{}" }, ID), {});
  assert.equal(specSheetText({ paramtypeitems: '{"returncode":1}' }, ID), "");
});

test("the sheet hands DeepSeek specs and fitted equipment only", () => {
  const sheet = specSheetText(FEEDS, ID);
  // Hard specs with values.
  for (const row of ["轴距(mm): 2630", "最大马力(Ps): 115", "前悬架类型: 麦弗逊式独立悬架", "前轮胎规格: 215/60 R17"]) {
    assert.ok(sheet.includes(row), `missing ${row}`);
  }
  // Fitted equipment, including the fitted lines of a mixed row.
  for (const row of ["驾驶辅助影像: ●360度全景影像; ●车侧盲区影像", "无钥匙启动系统: ●", "前/后驻车雷达: 前● / 后●"]) {
    assert.ok(sheet.includes(row), `missing ${row}`);
  }
  // Not fitted, optional extras, list price, warranty and plate dates stay out.
  for (const gone of ["车道偏离预警系统", "车顶行李架", "天窗类型", "前排座椅功能", "厂商指导价", "整车质保", "交强险", "官方0-100km/h加速"]) {
    assert.ok(!sheet.includes(gone), `still has ${gone}`);
  }
  // The listing's highlighted equipment.
  assert.ok(sheet.includes("【亮点配置 (fitted)】"));
  assert.ok(sheet.includes("OTA升级"));
});

test("the car record names the brand, trim and colour for DeepSeek", () => {
  const info = carInfoText(FEEDS, ID);
  assert.ok(info.includes("品牌: 起亚"));
  assert.ok(info.includes("车型: 2026款 1.5L IVT豪华舒享版"));
  assert.ok(info.includes("颜色: 白色"));
});

test("feeds read in the admin's browser survive the trip to the server", () => {
  const sent = encodePagePayload({
    url: "https://m.che168.com/cardetail/index?infoid=58237870",
    title: "车源详情",
    text: "0.01万公里\n表显里程",
    images: [],
    feeds: { ...FEEDS, carinfoext: 42 as unknown as string },
  });
  const got = decodePagePayload(sent);
  assert.equal(got.feeds?.paramtypeitems, FEEDS.paramtypeitems);
  assert.equal(got.feeds?.carinfo, FEEDS.carinfo);
  // Anything that isn't text is dropped.
  assert.equal(got.feeds?.carinfoext, undefined);
});

test("a payload without feeds still decodes, with none", () => {
  const got = decodePagePayload(
    encodePagePayload({
      url: "https://www.che168.com/dealer/1/59532396.html",
      title: "",
      text: "表显里程6.4万公里",
      images: [],
    }),
  );
  assert.equal(got.feeds, undefined);
});

test("the sheet's specs win over the AI's reading, and fill what it missed", async () => {
  const { reconcileListing } = await import("@/lib/import/che168-parse");
  const out = reconcileListing(
    { ...feedFacts(FEEDS, ID), previousOwners: 0 },
    {
      make: "Kia",
      model: "Seltos",
      trim: "Luxury",
      colour: "White",
      horsepower: 113,
      seats: undefined,
      drivetrain: "AWD",
      description: "A Kia.",
      features: ["360° camera"],
    },
  );
  assert.equal(out.horsepower, 115);
  assert.equal(out.seats, 5);
  assert.equal(out.drivetrain, "FWD");
  assert.equal(out.engineCapacity, "1.5L");
  assert.equal(out.carRmb, 100000);
});
