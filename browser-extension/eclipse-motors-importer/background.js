/**
 * Opens a che168 listing in a tab of the admin's own browser, waits for it to
 * show the car, reads it, closes the tab and hands the page back to the admin
 * page (via bridge.js). che168 blocks the Eclipse Motors server; it does not
 * block the admin's browser.
 */
import {
  che168ListingUrl,
  collectListing,
  LISTING_MARKERS_SOURCE,
  probeListing,
  scrollListingTo,
} from "./listing.js";

const LOAD_TIMEOUT_MS = 45_000;
/** Once che168 shows its security check, time for the admin to finish it by hand. */
const CHECK_TIMEOUT_MS = 180_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !sender.tab || msg?.type !== "read") return false;
  readListing(msg.url, sender.tab, msg.id).then(sendResponse, (e) =>
    sendResponse({ ok: false, error: `The import helper failed: ${e?.message || e}` }),
  );
  return true; // answering asynchronously
});

async function run(tabId, func, args = []) {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return res?.result;
}

async function tabOpen(tabId) {
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch {
    return false;
  }
}

function tellAdmin(adminTab, id, text) {
  chrome.tabs.sendMessage(adminTab.id, { type: "status", id, text }, { frameId: 0 }).catch(() => {});
}

async function readListing(rawUrl, adminTab, id) {
  const url = che168ListingUrl(rawUrl);
  if (!url) return { ok: false, error: "That isn't a che168 listing link." };

  // A visible tab rather than a background one: hidden tabs don't render, so
  // the lazy gallery never fills in, and a security check needs to be seen.
  const tab = await chrome.tabs.create({
    url,
    active: true,
    windowId: adminTab.windowId,
    index: adminTab.index + 1,
    openerTabId: adminTab.id,
  });
  try {
    let deadline = Date.now() + LOAD_TIMEOUT_MS;
    let checkShown = false;
    let probe = null;
    for (;;) {
      await sleep(700);
      if (!(await tabOpen(tab.id))) {
        return { ok: false, error: "The che168 tab was closed before the listing finished loading." };
      }
      // Throws while the tab is between documents (che168 reloads itself once).
      probe = await run(tab.id, probeListing, [LISTING_MARKERS_SOURCE]).catch(() => null);
      if (probe?.ready && !probe.captcha) break;
      if (probe?.captcha && !checkShown) {
        checkShown = true;
        deadline = Date.now() + CHECK_TIMEOUT_MS;
        tellAdmin(adminTab, id, "che168 is showing a security check. Finish it in the che168 tab and the import carries on.");
      }
      if (Date.now() > deadline) {
        return {
          ok: false,
          error: checkShown
            ? "che168's security check wasn't finished in time. Click Import to try again."
            : "The listing never showed its details. It may have been taken down.",
        };
      }
    }

    for (let attempt = 1; ; attempt++) {
      try {
        // Scroll through once so the lazy gallery writes in its photo links.
        for (let y = 0; y < probe.height; y += 800) {
          await run(tab.id, scrollListingTo, [y]);
          await sleep(80);
        }
        await sleep(400);
        const page = await run(tab.id, collectListing);
        if (!page) throw new Error("the page returned nothing");
        return { ok: true, page: { url, ...page } };
      } catch (e) {
        if (attempt >= 3) {
          return { ok: false, error: `Couldn't read the che168 tab (${e?.message || e}). Click Import to try again.` };
        }
        await sleep(1000);
        probe = (await run(tab.id, probeListing, [LISTING_MARKERS_SOURCE]).catch(() => null)) ?? probe;
      }
    }
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
    chrome.tabs.update(adminTab.id, { active: true }).catch(() => {});
  }
}
