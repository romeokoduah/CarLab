"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary.
 *
 * app/error.tsx catches errors thrown while rendering a page, but it renders
 * *inside* the root layout — so if the layout itself throws, it never runs and
 * the visitor gets Next's bare "Application error" screen again. This file
 * replaces the whole document in that case, which is why it must render its own
 * <html> and <body>.
 *
 * It also means globals.css is not loaded here, so every style is inline. That
 * is deliberate: a fallback that depends on the stylesheet it might not have is
 * not a fallback. The colours mirror the site's dark theme closely enough to
 * not look broken.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[eclipse-motors] root layout error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1220",
          color: "#e6edf7",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "34rem", textAlign: "center" }}>
          <p
            style={{
              letterSpacing: "0.18em",
              fontSize: "0.75rem",
              textTransform: "uppercase",
              color: "#8aa4c8",
              marginBottom: "0.75rem",
            }}
          >
            Eclipse Motors
          </p>
          <h1 style={{ fontSize: "1.6rem", margin: "0 0 0.75rem", fontWeight: 600 }}>
            The site is temporarily unavailable
          </h1>
          <p style={{ color: "#a9bdd8", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
            This is a fault on our side, not with your device or connection.
            Please try again in a moment.
          </p>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={reset}
              style={{
                background: "#d4af37",
                color: "#101827",
                border: "none",
                borderRadius: "0.4rem",
                padding: "0.65rem 1.4rem",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                border: "1px solid #2b3b52",
                color: "#e6edf7",
                borderRadius: "0.4rem",
                padding: "0.65rem 1.4rem",
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              Back to home
            </a>
          </div>
          {error.digest && (
            <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#7f97b8" }}>
              Reference: <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
