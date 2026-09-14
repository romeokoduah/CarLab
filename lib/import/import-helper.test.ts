import { test } from "node:test";
import assert from "node:assert/strict";
import { LISTING_MARKERS } from "@/lib/import/page-payload";
import {
  che168ListingUrl,
  LISTING_MARKERS_SOURCE,
} from "../../browser-extension/eclipse-motors-importer/listing.js";

test("the helper opens che168 listing links, upgraded to https", () => {
  assert.equal(
    che168ListingUrl(
      " https://www.che168.com/dealer/686431/59532396.html?pvareaid=100519#pos=1#page=1 ",
    ),
    "https://www.che168.com/dealer/686431/59532396.html?pvareaid=100519#pos=1#page=1",
  );
  assert.equal(
    che168ListingUrl("http://m.che168.com/cardetail/59532396.html"),
    "https://m.che168.com/cardetail/59532396.html",
  );
});

test("the helper refuses to open anything that isn't a che168 listing", () => {
  for (const bad of [
    "",
    "not a link",
    "https://che168.com.evil.example/dealer/1/59532396.html",
    "https://evil.example/www.che168.com/59532396.html",
    "javascript:alert(1)//che168.com/59532396",
    "https://user:pw@www.che168.com/dealer/1/59532396.html",
    "https://www.che168.com:8443/dealer/1/59532396.html",
    "https://www.che168.com/",
  ]) {
    assert.equal(che168ListingUrl(bad), null, bad);
  }
});

test("the helper waits for the same listing text the server checks for", () => {
  assert.equal(LISTING_MARKERS_SOURCE, LISTING_MARKERS.source);
});
