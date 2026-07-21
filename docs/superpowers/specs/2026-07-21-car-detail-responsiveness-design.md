# Car detail page responsiveness — design

Date: 2026-07-21

## Problem

The car detail page overflowed horizontally at every screen size once listings
carried a realistic number of photos.

Both columns of the `lg:grid-cols-[1.55fr_1fr]` grid were grid items, which
default to `min-width: auto`. The photo filmstrip is as wide as the photo count
— 16 thumbnails is 1,656px — so that became the column's minimum width and the
whole page inherited it. Measured on the live site:

| Viewport | Page width | Effect |
| --- | --- | --- |
| 390px (phone) | 1,680px | content rendered off-screen; sideways scrolling |
| 768px (tablet) | 1,680px | same |
| 1440px (desktop) | 2,059px | the price and Enquire panel sat entirely off-screen |

Two further problems showed up in the same audit:

- On phones the purchase panel came last in the DOM, so the price and Enquire
  button sat below the whole spec sheet. The `<h1>` also rendered after two
  `<h2>`s.
- The Overview heading rendered even with an empty description.

## Solution

### Layout

The page becomes one grid of three blocks, placed explicitly rather than
relying on source order:

| Block | Phone | `lg` and up |
| --- | --- | --- |
| Photos | row 1 | column 1, row 1 |
| Purchase panel (title, price, discount, Enquire) | row 2 | column 2, rows 1–2, sticky |
| Overview, specs, features | row 3 | column 1, row 2 |

One DOM order serves both, so nothing is duplicated and the heading order is
`h1` → `h2` → `h2`. Desktop keeps the layout it has today.

Tracks are declared `minmax(0,1.55fr) minmax(0,1fr)` and each block carries
`min-w-0`, which is what actually stops a wide child from setting the column
minimum.

### Gallery

- Prev/next arrows were `opacity-0 group-hover:opacity-100`, so on touch — which
  has no hover — they were invisible. Now always visible, hover-revealed only
  from `lg` up.
- The lightbox filmstrip used `justify-center` on the scroll container, which
  puts the first thumbnails out of reach when the strip overflows. The flex row
  moves to an inner `w-max mx-auto` wrapper: centred when it fits, scrollable
  from its true start when it does not.
- The main photo is `4/3` on phones (taller, better for cars), `16/10` from
  `sm`, capped at `70vh` so it cannot eat a whole desktop screen.

### Phone action bar

Once the Enquire button scrolls off the top, a bar with the price and an Enquire
button pins to the bottom, tracked with an `IntersectionObserver`. Hidden from
`lg` up, where the purchase panel is already sticky. It respects
`env(safe-area-inset-bottom)`, and a spacer keeps it from covering the end of
the page.

The generic floating WhatsApp bubble is hidden on `/car/*`: it would overlap the
new bar and sends a message with no car attached.

## Testing

Verified with Playwright against the real catalogue (local server, production
database over an SSH tunnel), at 360, 390, 414, 768, 1024, 1280 and 1440px:

- `document.scrollWidth === clientWidth` on the car page and the inventory page
  at every width
- heading order is `h1` → `h2` → `h2`
- the phone bar appears after scrolling past the CTA, fits the screen, adds no
  overflow, and hides again at the top
- every lightbox thumbnail is reachable at `scrollLeft: 0`
- the next-photo arrow computes to `opacity: 1` on a touch context

22 checks, all passing.
