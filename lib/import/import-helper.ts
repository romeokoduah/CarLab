/**
 * The admin page's side of the Eclipse Motors import helper
 * (browser-extension/eclipse-motors-importer).
 *
 * che168 blocks this server, but not the admin's own browser. When the helper
 * is installed, the page hands it the pasted link; it opens the listing in a
 * tab, reads it and passes the page back here, and the page posts that to the
 * import route instead of the bare link. The two sides talk over
 * window.postMessage through the helper's content script.
 */
import type { PagePayload } from "@/lib/import/page-payload";

export const HELPER_TAG = "eclipse-motors-import-helper";

type FromHelper =
  | { type: "ready"; version: string }
  | { type: "status"; id: string; text: string }
  | { type: "result"; id: string; ok: true; page: PagePayload }
  | { type: "result"; id: string; ok: false; error: string };

export class ImportHelperError extends Error {}

const READ_TIMEOUT_MS = 5 * 60_000;

function listen(handler: (m: FromHelper) => void): () => void {
  const onMessage = (e: MessageEvent) => {
    if (e.source !== window || e.origin !== window.location.origin) return;
    const m = e.data;
    if (m && m.tag === HELPER_TAG && m.dir === "from-helper") handler(m as FromHelper);
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}

function send(m: Record<string, unknown>) {
  window.postMessage({ tag: HELPER_TAG, dir: "to-helper", ...m }, window.location.origin);
}

/** The installed helper's version, or null when it doesn't answer. */
export function detectImportHelper(timeoutMs = 1000): Promise<string | null> {
  return new Promise((resolve) => {
    const stop = listen((m) => {
      if (m.type !== "ready") return;
      clearTimeout(timer);
      stop();
      resolve(m.version);
    });
    const timer = setTimeout(() => {
      stop();
      resolve(null);
    }, timeoutMs);
    send({ type: "hello" });
  });
}

/** Has the helper read a listing in the admin's browser. Rejects with a message fit to show. */
export function readListingWithHelper(
  url: string,
  onStatus: (text: string) => void,
): Promise<PagePayload> {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const stop = listen((m) => {
      if (m.type === "status" && m.id === id) onStatus(m.text);
      if (m.type !== "result" || m.id !== id) return;
      clearTimeout(timer);
      stop();
      if (m.ok) resolve(m.page);
      else reject(new ImportHelperError(m.error));
    });
    const timer = setTimeout(() => {
      stop();
      reject(new ImportHelperError("The import helper took too long. Click Import to try again."));
    }, READ_TIMEOUT_MS);
    send({ type: "read", id, url });
  });
}
