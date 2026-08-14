"use client";

import { useEffect } from "react";
import { SITE_CONFIG } from "@/lib/config";

/**
 * Route-level error boundary.
 *
 * Without this file, any error thrown while rendering a page fell through to
 * Next's built-in screen: a bare "Application error: a server-side exception
 * has occurred" on a white page, with no branding, no explanation and no way
 * for the visitor to reach us. That is what a customer saw during an outage.
 *
 * This replaces it with a page that says what happened, offers a retry, and —
 * most importantly — keeps the WhatsApp route open, because a buyer who cannot
 * browse can still be sold to. The underlying error is not shown: it can carry
 * connection strings and internal paths. It goes to the server log instead.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reaches the PM2/systemd log, where the operator can match `digest`
    // against the stack trace Next recorded server-side.
    console.error("[eclipse-motors] render error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  const whatsapp = `https://wa.me/${SITE_CONFIG.whatsappNumber}`;

  return (
    <main className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Something went wrong on our side
        </h1>
        <p className="mx-auto max-w-prose text-muted-foreground">
          This page didn&apos;t load properly. It&apos;s a fault with our
          website, not with your connection or your device — and our team has
          been notified.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
        >
          Back to home
        </a>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
        >
          Message us on WhatsApp
        </a>
      </div>

      {error.digest && (
        // Give the visitor something to quote to us. It identifies the exact
        // failure in the server log without revealing anything about it.
        <p className="text-xs text-muted-foreground">
          Reference: <code className="font-mono">{error.digest}</code>
        </p>
      )}
    </main>
  );
}
