"use client";

/**
 * Per-browser customer state.
 *
 * - `reference` is the customer's own tracking code, kept so they only ever
 *   fill in the enquiry form once.
 * - `sessionKey` is a random, meaningless token used purely to de-duplicate
 *   view counts. It is not an identifier we can tie to a person, and no IP
 *   address is ever recorded.
 */
const REF_KEY = "em_customer_ref";
const SESSION_KEY = "em_session_key";

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode — tracking simply degrades */
  }
}

export function getStoredReference(): string | null {
  if (typeof window === "undefined") return null;
  return safeGet(REF_KEY);
}

export function storeReference(reference: string): void {
  if (typeof window === "undefined") return;
  safeSet(REF_KEY, reference);
}

export function clearStoredReference(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REF_KEY);
  } catch {
    /* ignore */
  }
}

export function getSessionKey(): string {
  if (typeof window === "undefined") return "";
  let key = safeGet(SESSION_KEY);
  if (!key) {
    key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    safeSet(SESSION_KEY, key);
  }
  return key;
}

/** Fire-and-forget beacon; never blocks or breaks navigation. */
export function sendBeacon(url: string, payload: unknown): void {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    /* analytics must never break the page */
  }
}
