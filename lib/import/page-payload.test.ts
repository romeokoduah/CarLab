import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LISTING_MARKERS,
  PAGE_PAYLOAD_PREFIX,
  PagePayloadError,
  decodePagePayload,
  encodePagePayload,
} from "@/lib/import/page-payload";

const GALLERY =
  "https://2sc2.autoimg.cn/escimg/auto/g33/M01/900x675_0_q87_c42_autohomecar__ChtlyGabc123.jpg";

const LISTING = {
  url: "https://www.che168.com/dealer/684930/59868479.html?pvareaid=100519#pos=1#page=1",
  title: "【长沙】长安UNI-K 2021款 2.0T 尊贵型_6.3500_二手车之家",
  text: "长安UNI-K 2021款 2.0T 尊贵型\n表显里程\n6.79万公里\n上牌时间\n2021年12月\n¥6.35万",
  images: [GALLERY],
};

const posted = (over: Record<string, unknown> = {}) =>
  PAGE_PAYLOAD_PREFIX + JSON.stringify({ v: 1, ...LISTING, ...over });

test("a listing read in the browser survives the trip to the import route", () => {
  const got = decodePagePayload(encodePagePayload(LISTING));
  assert.deepEqual(got, LISTING);
  assert.match(got.text, LISTING_MARKERS);
});

test("only che168's image CDN survives, because the server downloads every link", () => {
  const got = decodePagePayload(
    posted({
      images: [
        `${GALLERY}?x=1#frag`,
        "http://x.autoimg.cn/g/900x675_0_q87_c42_autohomecar__def.jpg",
        GALLERY, // duplicate
        "https://autoimg.cn.evil.example/a.jpg",
        "https://evil.example/autoimg.cn/b.jpg",
        "http://169.254.169.254/latest/meta-data",
        "file:///etc/passwd",
        "https://user:pw@x.autoimg.cn/c.jpg",
        "https://x.autoimg.cn:8443/d.jpg",
        42,
        null,
      ],
    }),
  );
  assert.deepEqual(got.images, [
    GALLERY,
    "https://x.autoimg.cn/g/900x675_0_q87_c42_autohomecar__def.jpg",
  ]);
});

test("a page from anywhere other than che168 is refused", () => {
  assert.throws(() => decodePagePayload(posted({ url: "https://www.example.com/59868479.html" })), PagePayloadError);
  assert.throws(() => decodePagePayload(posted({ url: "https://che168.com.evil.example/1.html" })), PagePayloadError);
  assert.throws(() => decodePagePayload(posted({ url: "javascript:alert(1)" })), PagePayloadError);
});

test("a cut-off, empty or foreign payload gives a clear error rather than a crash", () => {
  assert.throws(() => decodePagePayload(posted().slice(0, 60)), /cut off/);
  assert.throws(() => decodePagePayload(posted({ text: "   " })), /no text/);
  assert.throws(() => decodePagePayload("https://www.che168.com/dealer/1/2.html"), PagePayloadError);
  assert.throws(() => decodePagePayload(`${PAGE_PAYLOAD_PREFIX}[1,2]`), PagePayloadError);
});
