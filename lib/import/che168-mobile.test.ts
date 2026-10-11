import { test } from "node:test";
import assert from "node:assert/strict";
import {
  che168ReadUrl,
  focusMobileListing,
  parseCnMileage,
  parseCnPrice,
  parseCnTransfers,
  parseCnYear,
  parseSrcId,
} from "@/lib/import/che168-parse";
import { LISTING_MARKERS } from "@/lib/import/page-payload";
import { che168ListingUrl } from "../../browser-extension/eclipse-motors-importer/listing.js";

/**
 * A trimmed copy of the real mobile page for infoid 58237870 (2026-10-11), as
 * innerText with blank lines collapsed. On this page the value comes BEFORE its
 * label, and other cars' prices and mileages surround the listing.
 */
const MOBILE_PAGE = [
  "1/22",
  "外观(7)",
  "内饰(7)",
  "细节(8)",
  "相册",
  "1.7万公里",
  "10.68",
  "万",
  "2.2万公里",
  "8.28",
  "万",
  "全部",
  "11辆",
  "平台补贴+商家直降，品质好车放心选购",
  "活动价",
  "10",
  "万",
  "低于市场价16.67%",
  "新车含税价:14.1万",
  "赛图斯 2026款 1.5L IVT豪华舒享版",
  "0次过户",
  "原厂质保",
  "2026-04",
  "上牌时间",
  "0.01万公里",
  "表显里程",
  "0次",
  "过户次数",
  "牡丹江",
  "所在地区",
  "前置前驱",
  "驱动方式",
  "CVT无级变速",
  "变速箱",
  "1.5L",
  "发动机",
  "价格分析",
  "当前报价",
  "10",
  "万",
  "比同车况省",
  "20000",
  "元",
  "全国同款比价",
  "2023款",
  "在售82辆",
  "9.2万起",
  "里程多0.29万公里 车龄多0.2年 白色",
  "9.8万",
  "卖家说",
  "原版原漆，实表，无事故，无水淹，无火烧，支持三方检测，",
  "大家都在问",
  "本店在售",
  "更多",
  "2023款 1.5L CVT豪华版",
  "10.68万",
  "2021款 280TSI 两驱豪华版PLUS",
  "12.98万",
  "购车方案",
  "首付比例",
  "车辆PK",
  "PK车辆",
  "赛图斯 2023款 1.5L CVT豪华版",
  "10.68万",
  "以旧换新",
  "预估7万",
  "本页面可能含有广告信息，平台不参与车辆交易，价格请与商家协商。",
  "联系卖家",
  "Detected Overseas Access",
].join("\n");

/** What the mobile page shows while it is still loading. */
const MOBILE_SKELETON = "0/0\n万\n车辆名称\n-\n上牌时间\n-万公里\n表显里程\n-\n过户次数\n-\n所在城市";

test("an English-mirror link is read from the Chinese mobile page for the same car", () => {
  const want = "https://m.che168.com/cardetail/index?infoid=58237870";
  for (const link of [
    "https://global.che168.com/en/detail/58237870",
    " http://global.che168.com/en/detail/58237870?from=list#top ",
    "https://m.che168.com/cardetail/index?infoid=58237870",
    "https://m.che168.com/cardetail/index?pvareaid=1&infoid=58237870#x",
  ]) {
    assert.equal(che168ReadUrl(link), want, link);
    assert.equal(che168ListingUrl(link), want, link);
  }
});

test("desktop listing links are still read as pasted", () => {
  const link = "https://www.che168.com/dealer/686431/59532396.html?pvareaid=100519";
  assert.equal(che168ReadUrl(link), link);
  assert.equal(che168ListingUrl(link), link);
});

test("the server and the helper refuse the same non-listing links", () => {
  for (const bad of [
    "https://global.che168.com/en/",
    "https://m.che168.com/cardetail/index?infoid=",
    "https://global.che168.com.evil.example/en/detail/58237870",
    "https://user:pw@global.che168.com/en/detail/58237870",
  ]) {
    assert.equal(che168ReadUrl(bad), null, bad);
    assert.equal(che168ListingUrl(bad), null, bad);
  }
});

test("the car id comes out of a mobile link's ?infoid=", () => {
  assert.equal(parseSrcId("https://m.che168.com/cardetail/index?infoid=58237870"), "58237870");
});

test("the mobile page's price, mileage, year and transfers are read literally", () => {
  const text = focusMobileListing(MOBILE_PAGE);
  assert.equal(parseCnPrice(text), 100000);
  assert.equal(parseCnMileage(text), 100);
  assert.equal(parseCnYear(text), 2026);
  assert.equal(parseCnTransfers(text), 0);
  // Unfocused, the shop strip's cars come first — the reads must not pick them up.
  assert.equal(parseCnPrice(MOBILE_PAGE), 100000);
  assert.equal(parseCnMileage(MOBILE_PAGE), 100);
});

test("the other cars on the mobile page are cut out, this car and the seller's notes kept", () => {
  const text = focusMobileListing(MOBILE_PAGE);
  for (const other of ["10.68", "8.28", "9.2万起", "12.98万", "280TSI", "PK车辆", "本页面可能含有广告信息"]) {
    assert.ok(!text.includes(other), `still contains ${other}`);
  }
  for (const own of ["赛图斯 2026款 1.5L IVT豪华舒享版", "当前报价", "原版原漆", "前置前驱", "以旧换新"]) {
    assert.ok(text.includes(own), `lost ${own}`);
  }
});

test("a page without those sections is left as it is", () => {
  const text = "赛图斯 2026款\n2026-04\n上牌时间";
  assert.equal(focusMobileListing(text), text);
});

test("a loaded listing counts as ready; the loading placeholder does not", () => {
  assert.ok(LISTING_MARKERS.test(MOBILE_PAGE));
  assert.ok(!LISTING_MARKERS.test(MOBILE_SKELETON));
  assert.ok(LISTING_MARKERS.test("表显里程10.91万公里"));
  assert.ok(LISTING_MARKERS.test("上牌时间2023年10月"));
});
