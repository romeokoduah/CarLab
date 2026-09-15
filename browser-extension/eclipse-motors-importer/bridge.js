/**
 * Runs on the Eclipse Motors site and relays between the admin page
 * (lib/import/import-helper.ts, over window.postMessage) and background.js.
 *
 * It can be added to a tab twice: once when the page loads, and again by
 * background.js when the helper is installed or reloaded. A copy left over from
 * before a reload can no longer reach background.js, so it stays silent and
 * lets the new copy answer.
 */
(() => {
  const TAG = "eclipse-motors-import-helper";
  const live = () => !!chrome.runtime?.id;
  if (globalThis.__emImportBridgeLive?.()) return;
  globalThis.__emImportBridgeLive = live;

  const version = chrome.runtime.getManifest().version;
  const post = (m) => window.postMessage({ tag: TAG, dir: "from-helper", ...m }, location.origin);

  const onMessage = (e) => {
    if (!live()) {
      window.removeEventListener("message", onMessage);
      return;
    }
    if (e.source !== window || e.origin !== location.origin) return;
    const m = e.data;
    if (!m || m.tag !== TAG || m.dir !== "to-helper") return;
    if (m.type === "hello") {
      post({ type: "ready", version });
    } else if (m.type === "read" && typeof m.id === "string" && typeof m.url === "string") {
      chrome.runtime
        .sendMessage({ type: "read", id: m.id, url: m.url })
        .then((r) => post({ type: "result", id: m.id, ...(r || { ok: false, error: "The import helper didn't answer." }) }))
        .catch((err) => {
          console.warn("Eclipse Motors import helper:", err);
          post({
            type: "result",
            id: m.id,
            ok: false,
            error: "The import helper was updated or restarted. Reload this page and try again.",
          });
        });
    }
  };
  window.addEventListener("message", onMessage);

  chrome.runtime.onMessage.addListener((m) => {
    if (m?.type === "status") post({ type: "status", id: m.id, text: m.text });
  });

  post({ type: "ready", version });
})();
