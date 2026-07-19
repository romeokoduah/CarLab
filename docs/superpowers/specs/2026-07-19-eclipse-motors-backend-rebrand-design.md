# Eclipse Motors — Backend, Persistence, Auth & Rebrand

**Date:** 2026-07-19
**Status:** Approved design → planning
**Owner:** romeo.tweneboahkoduah@gmail.com
**Live site:** https://eclipsemotors.org (Contabo VPS `169.58.42.182`, `ssh contabo`)

## Problem

The site is a Next.js **static export** served by nginx. There is no server and no
shared database — the entire catalogue, "admin auth", and settings live in each
visitor's browser `localStorage`. This blocks three requested outcomes and is the
root cause of the security findings:

1. **Cars added in admin don't persist or propagate.** They exist only in the
   browser they were created in; other devices see only the seed cars.
2. **Admin "login" enforces nothing** and its credentials ship in the public JS
   bundle, so `/admin` cannot actually be protected or hidden.
3. **Rebrand** CarLab → Eclipse Motors is needed across the UI and metadata.

## Security audit (delivered to user)

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | Critical | Admin email/password compiled into public JS via `NEXT_PUBLIC_ADMIN_*` (`lib/config.ts`), hardcoded defaults `admin@carlab.gh` / `carlab-admin`. | Move auth server-side; password hashed in DB; remove the `NEXT_PUBLIC_ADMIN_*` vars entirely. |
| 2 | Critical | Auth is a client-side check on a static site (`lib/auth.ts`), trivially bypassed; `/admin` reachable by URL. | Server-enforced session + middleware guard on `/admin/**` and admin APIs. |
| 3 | High | "Use demo credentials" button auto-fills admin login (`components/admin/login-form.tsx`). | Remove the button. |
| 4 | High | No security headers (HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, CSP). | Add via nginx vhost. |
| 5 | Medium | `/admin` UI shipped to every visitor and indexable-by-URL. | `noindex` (already in admin layout), de-link from public UI, server-gate. |
| 6 | Low | WhatsApp number & GHS rate in the bundle. | Accepted — these are public by design. Noted only. |

A fuller sweep runs during implementation: check for shipped source maps, exposed
`.env`/dotfiles on nginx, directory listing, dependency CVEs (`next@14.2.15`), and
any other secrets in the repo.

## Target architecture

Convert from static files to a small Node app on the VPS (same pattern as the
existing `cleen` app), backed by the PostgreSQL already running there.

```
Browser ──HTTPS──> nginx (eclipsemotors.org) ──proxy──> Next.js (pm2, :3001)
                                                             │
                                             ┌───────────────┼───────────────┐
                                         PostgreSQL      /uploads (car photos on disk,
                                       (eclipse DB)        served by nginx at /uploads/)
```

- **Runtime:** Next.js run as a Node server (`next start`) under **pm2**; nginx
  reverse-proxies `eclipsemotors.org` (443) → `127.0.0.1:3001`. Drop
  `output: "export"` from `next.config.mjs`. The GitHub Pages workflow/basePath
  becomes obsolete and is removed.
- **Database:** PostgreSQL (existing `:5432`), dedicated `eclipse` DB + role.
  Access via **Drizzle ORM** with `drizzle-kit` migrations. Schema mirrors
  `lib/types.ts`.
- **Auth:** admin credentials in an `admin_users` table, password hashed with
  `bcryptjs` (pure-JS, no native build). Login issues an **httpOnly, Secure,
  SameSite=Lax** signed session cookie (via `jose` JWT or `iron-session`).
  `middleware.ts` guards `/admin/**` and `/api/admin/**`; unauthenticated →
  redirect to login / `401`. Initial admin seeded from `ADMIN_EMAIL` +
  `ADMIN_PASSWORD_HASH` server env (never `NEXT_PUBLIC_*`).
- **Uploads:** admin uploads image files through a protected route handler;
  files written to `/var/www/eclipse/uploads` (outside the repo), served by
  nginx at `/uploads/`. Validate MIME (jpeg/png/webp) and size (≤ 8 MB); generate
  safe randomized filenames. `sharp` resize is optional/nice-to-have.

### Data model (Postgres)

Derived from `lib/types.ts`:

- `cars` — all `Car` scalar fields (make, model, year, priceGhs, mileageKm,
  transmission, fuel, bodyType, colour, condition, description, status, verified,
  createdAt, + optional extended specs: engineCapacity, drivetrain, seats, doors,
  cylinders, horsepower, previousOwners, registrationStatus). `features` as
  `text[]`, `videoUrl` nullable.
- `car_images` — (id, car_id FK, url, position, alt). Cover = position 0.
- `discounts` — the `DiscountCode` shape.
- `analytics_events` — (id, car_id, type, created_at).
- `settings` — singleton row (dealerName, whatsappNumber, ghsPerUsd).
- `admin_users` — (id, email unique, password_hash, created_at).

Seed the DB with `SEED_CARS` / `SEED_DISCOUNTS` on first migration so the
catalogue is populated. LocalStorage-only cars a user added previously cannot be
auto-migrated (they never left that browser) — re-add once.

### Data flow / rework

The UI already funnels through a clean seam (`lib/api.ts` + `lib/store.ts`), so
component surfaces barely change:

- **Public pages** (`/`, `/inventory`, `/car/[id]`) become server components that
  read cars from Postgres at request time → newly added cars appear for everyone
  immediately. The `/car/[id]` static-fallback hack (`_view` shell + nginx
  `try_files`) is removed — dynamic rendering makes it unnecessary.
- `lib/api.ts` functions become real DB queries (server) / fetches.
- **Admin** stays client components but its mutations call **protected** `/api/admin/*`
  route handlers instead of writing to localStorage. The zustand store is reduced
  to UI/preference state (currency, favourites) + a client cache hydrated from the API.
- `favourites` and `currency` remain client/localStorage (per-visitor, fine).

## Rebrand touchpoints (CarLab → Eclipse Motors)

`lib/config.ts` (dealerName, admin email default removed), `components/site/logo.tsx`
(new "EM"/eclipse mark + wordmark), `app/layout.tsx` (title, metadataBase →
`https://eclipsemotors.org`), `lib/whatsapp.ts` defaults, `components/site/car-detail.tsx`
title suffix, `components/admin/settings-form.tsx` defaults, `app/inventory/page.tsx`
copy, `package.json` name/description, `README.md`, `.env.example`, store key
`carlab-store` → `eclipse-store` (with migration note). New favicon/logo mark.

## Delivery phases

**Phase 1 — low risk, ships on the current static site:**
- Rebrand to Eclipse Motors (name, logo, titles, metadata, defaults).
- Remove exposed credentials + "demo credentials" button.
- `noindex`/de-link `/admin`; add security headers in nginx.
- Deliver the written audit report.
- Deploy to Contabo (static, unchanged deploy model). Commit + push.

**Phase 2 — the backend:**
- Node app + PostgreSQL (`eclipse` DB, Drizzle schema + migrations + seed).
- Real admin auth (user-set email + password; hashed).
- Persistent catalogue + car-photo uploads.
- Convert deployment to pm2 process behind nginx; re-point domain vhost from the
  static `out/` to `127.0.0.1:3001`; retire the `:8081` static path and the
  `/car/` fallback location.
- Deploy to Contabo. Commit + push.

## Local mirror

Local repo `F:\AI_DEV_LAB\CarLab` remains source of truth; all commits push to
GitHub and the server deploys from it. Phase 2 adds `docker-compose.yml` (local
Postgres) + `.env.example` `DATABASE_URL` so `npm run dev` runs fully locally,
mirroring production.

## Out of scope (YAGNI)

- Multi-admin roles/permissions (single admin account is enough).
- Buyer accounts / checkout / payments.
- Migrating existing localStorage cars (re-add once).
- CDN/image-optimization service (nginx serves uploads directly).

## Risks

- **Deploy-model change** (static → running process) is the main risk; mitigated
  by phasing and by mirroring the proven `cleen` pm2+nginx pattern.
- **Uptime:** the app must stay running (pm2 resurrect on reboot). Configure
  `pm2 startup` + `pm2 save`.
- **DB migrations on deploy** must be idempotent and run before app reload.
