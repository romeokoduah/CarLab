# Brand assets

`eclipse-motors-logo-master.jpeg` is the logo as supplied by the owner (2026-07-31)
and is the source everything else is derived from. Keep it — the vectors were
traced from it and a retrace needs the original.

## What ships

| File | What it is |
| --- | --- |
| `components/site/logo-artwork.tsx` | The lockup as an inline `<symbol>`, filled `currentColor`. This is what the site renders. |
| `public/logo.svg` | The same lockup as a standalone file in brand blue, for anything outside the app (email signatures, partner sites, print). |
| `app/icon.svg` | Favicon — white mark on a brand-blue tile. Next.js wires this up automatically. |
| `app/apple-icon.png` | 180×180 iOS home-screen icon. |

## Colour

The brand blue is **`#1324A4`** (`hsl(233 79% 36%)`), measured off the master
artwork rather than guessed. It is the site's accent colour, not just the
logo's — see the palette note at the top of `app/globals.css`.

The logo is painted with `text-brand`, so it follows the theme:

| | `--brand` | on |
| --- | --- | --- |
| Light | `233 79% 36%` — `#1324A4`, the true logo blue | 11.0:1 |
| Dark | `230 82% 68%` — `#6A81F0`, lifted | 5.7:1 |

The dark theme cannot use the real blue: against the near-black background it
manages about 1.4:1, which is effectively invisible. Anything sitting *on* a
filled `bg-brand` must use `text-brand-foreground`, which flips with the theme
(white on light, near-black on dark) — a hardcoded colour will fail in one of
the two.

## Retracing

The lockup is a single path: in the master artwork the lower sweep runs down
into the "O" of MOTORS, so the mark and the wordmark are one connected shape and
cannot be separated. The mark-only version used for the icons is a crop taken
above the wordmark (cut at y=402 of the source, where the tail is thinnest and
reads as a natural taper).

Both were traced with `potrace` from a 2–3× upscale of the master, with a light
blur to stop the tracer chasing JPEG ringing, then scaled to a 1000-unit-wide
viewBox and rounded to 0.1.
