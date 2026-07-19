# Eclipse Motors

A premium, mobile-first **car sales platform** for a Ghana-based dealer. It pairs a
cinematic public storefront with a private admin dashboard for managing inventory,
discount codes and settings — and makes it effortless for buyers to reach the seller
on **WhatsApp**.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**,
**shadcn/ui** (functional UI) and **Magic UI** (motion/polish layer).

---

## Highlights

**Storefront**
- Cinematic landing page — retro-grid hero, aurora headline, animated stats, bento
  featured grid with cursor-spotlight cards and a border beam on the top pick, brand
  marquee, and a "how buying works" section.
- Full inventory grid with a **sticky filter panel** (bottom sheet on mobile), **live
  per-option result counts**, removable filter chips, and a natural-language-ish search
  ("automatic SUV under 250k").
- Every filter change updates the **URL query string** — shareable and back-button
  friendly.
- Detail page: swipeable gallery with a keyboard-navigable full-screen lightbox,
  thumbnail strip, optional YouTube walkaround, specs, features, and a sticky purchase
  panel.
- **Discount codes**: "Have a code?" input validates percentage/fixed codes (min-price,
  expiry, usage limit, per-make restriction), shows the new price and saved amount, and
  fires **confetti** on success.
- **WhatsApp everywhere**: every enquire button opens `wa.me` with the car title, price
  (discounted if a code was applied) and listing URL pre-filled. Plus a floating button
  on every page.
- Favourites saved to **localStorage** — no login needed. GHS ↔ USD currency toggle and
  a dark/light theme toggle (dark by default).

**Admin dashboard** (`/admin`)
- Email/password sign-in gate (demo auth; swap for Supabase Auth in production).
- Inventory manager: searchable table with status filter and quick actions — edit, mark
  sold, duplicate, delete.
- Add/edit form with all spec fields, tag-style features, and a **multi-image uploader**
  with drag-and-drop, **drag-to-reorder** (first image = cover), and delete.
- Discount code manager: create / edit / activate / deactivate, with usage counts.
- Settings: WhatsApp number, GHS→USD rate, dealership name.
- Analytics: views, favourites and WhatsApp clicks per car, most-viewed / most-enquired.

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. (optional) configure environment
cp .env.example .env.local   # then edit values

# 3. Run the dev server
npm run dev
# → http://localhost:3000
```

Other scripts:

```bash
npm run build       # production build
npm run start       # serve the production build
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
```

The app ships with **bundled seed data** (10 sample cars, 4 discount codes) and works
fully out of the box — no database or API keys required.

### Admin login

In production, `/admin` is protected at the server (nginx HTTP Basic Auth) and is
not indexed by search engines. Ask the site owner for credentials.

For local development you may optionally enable the in-app client login by setting
`NEXT_PUBLIC_ADMIN_EMAIL` and `NEXT_PUBLIC_ADMIN_PASSWORD` in `.env.local`. Never
set real secrets in `NEXT_PUBLIC_*` vars — they ship in the browser bundle.

---

## Configuration

All configuration is optional — sensible defaults are baked in. Copy `.env.example`
to `.env.local` to override.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `233201234567` | Dealer WhatsApp number, **digits only** (country code + number, no `+`). Used by every WhatsApp button. |
| `NEXT_PUBLIC_DEALER_NAME` | `Eclipse Motors` | Dealership name shown across the site. |
| `NEXT_PUBLIC_GHS_PER_USD` | `15.5` | GHS→USD rate for the currency toggle (1 USD = this many GHS). |
| `NEXT_PUBLIC_ADMIN_EMAIL` | _(unset)_ | Optional local-dev client login email. Leave unset in production. |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | _(unset)_ | Optional local-dev client login password. Leave unset in production. |

### Setting the WhatsApp number

Two ways:
1. **Env var** — set `NEXT_PUBLIC_WHATSAPP_NUMBER` in `.env.local` (applies at build time).
2. **At runtime** — Admin → **Settings** → WhatsApp number. This persists to the browser
   and overrides the env default for that device (handy for quick changes / demos).

The message is generated in [`lib/whatsapp.ts`](lib/whatsapp.ts) and always includes the
car title, the current (or discounted) price, and the listing URL.

### Sample discount codes

| Code | Effect | Conditions |
| --- | --- | --- |
| `SHOWROOM10` | 10% off | min price GHS 200,000 |
| `GHS20K` | GHS 20,000 off | min price GHS 300,000 |
| `TOYOTAVIP` | 7% off | Toyota vehicles only |
| `EXPIRED5` | 5% off | inactive / expired (demo of the error state) |

---

## Project structure

```
app/
  layout.tsx            # root layout: Sora font, theme, chrome, toaster, floating WhatsApp
  page.tsx              # landing page
  inventory/            # inventory grid + filters (URL-synced)
  car/[id]/             # detail page (SSG params + metadata; interactive body)
  favourites/           # saved cars (localStorage)
  admin/                # login-gated dashboard
components/
  ui/                   # shadcn/ui primitives (functional UI)
  magicui/              # Magic UI motion components (delight layer)
  site/                 # storefront components (car card, gallery, filters, …)
  admin/                # dashboard components (managers, forms, analytics)
lib/
  api.ts                # data-access seam (seed today; swap for Supabase/FastAPI)
  store.ts              # client store (demo backend) — seeded, localStorage-persisted
  auth.ts               # demo admin auth
  filters.ts            # filter parsing/serialization + natural-language search
  discounts.ts          # discount validation (pure)
  whatsapp.ts           # wa.me deep-link builder
  currency.ts           # GHS/USD formatting
  data/                 # seed cars, discount codes, image pool
  types.ts config.ts hooks.ts utils.ts
```

---

## Swapping in a real backend (Supabase / FastAPI)

The data layer is intentionally isolated so it can be replaced without touching the UI:

- **[`lib/api.ts`](lib/api.ts)** is the single seam between UI and backend. Today it
  returns bundled seed data (used for server metadata and static params).
- **[`lib/store.ts`](lib/store.ts)** is the client store that powers interactivity and
  admin CRUD. Its actions (`addCar`, `updateCar`, `applyDiscount`, …) are where you'd
  call your API.

To adopt **Supabase**:
1. Provision the schema below (Postgres) and a Storage bucket for `car_images`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Implement the functions in `lib/api.ts` against Supabase, and point the store actions
   at them. Replace `lib/auth.ts` with `supabase.auth` and guard `/admin` server-side.

No storefront/admin component imports a backend directly — they all read/write through
these two modules.

### Data model

```
cars(id, make, model, year, price_ghs, mileage_km, transmission, fuel,
     body_type, colour, condition, description, features[], video_url,
     status, verified, created_at)
car_images(id, car_id, url, position)
discount_codes(id, code, type[percent|fixed], value, min_price, expires_at,
     usage_limit, used_count, make_restriction, active)
analytics_events(id, car_id, type[view|favourite|whatsapp_click], created_at)
```

---

## Design notes

- **Font:** Sora (via `next/font`).
- **Palette:** deep near-black background with off-white text and a single restrained
  **warm metallic gold** accent. Rounded-2xl cards, hairline borders, generous negative
  space. Dark by default with a light-mode toggle.
- Motion is subtle and purposeful — no accent side-stripes, no purple/blue gradients, no
  glassmorphism overload, no emoji in the UI.
- Application UI (filters, tables, forms, dashboard) uses **shadcn/ui**; Magic UI is
  reserved for the delight layer (hero, stats, featured cards, marquee, confetti, CTAs).

### Accessibility & performance
- Skeleton loading states wherever data hydrates — never a blank flash.
- Full keyboard access on the gallery lightbox and dialogs; visible focus states; alt
  text on images; tap targets ≥ 44px.
- Next `<Image>` with responsive `sizes` and lazy loading; static generation for the
  landing and car detail routes.

---

## Notes / limitations

- This build uses a **client-side store** (localStorage) as a stand-in backend so the
  full experience — including admin CRUD and analytics — works with zero setup. Data is
  per-device and resettable from Admin → Settings → *Reset demo data*.
- Uploaded images in the admin form are read as data URLs for the demo; wire the uploader
  to Supabase Storage for real persistence.
- Admin auth is a client-side gate for demo purposes only. Do not treat it as secure —
  replace with Supabase Auth (and server-side route protection) before shipping.
