# Eclipse Motors — Phase 2 (Backend, Persistence, Real Auth, Uploads) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the catalogue permanent and shared across all devices, protect `/admin` with a real server-enforced login, and support car-photo uploads — by turning the static export into a Node app backed by the PostgreSQL already on the VPS.

**Architecture:** Next.js runs as a Node server (`next start`) under pm2, reverse-proxied by nginx. Data lives in PostgreSQL (plain `pg` + idempotent SQL schema). The existing zustand store is kept as the client runtime cache but **re-backed by a real API**: it hydrates from `GET /api/*` on load, and admin mutations call **protected** `/api/admin/*` routes that persist to Postgres. Auth is a bcrypt-hashed admin user + a signed httpOnly session cookie, enforced by `middleware.ts`. Photos upload to a persistent disk dir served by nginx at `/uploads/`.

**Tech Stack:** Next.js 14 (Node runtime, no `output: export`), `pg`, `bcryptjs`, `jose` (JWT cookie), nginx, pm2, Docker (local Postgres only).

## Global Constraints

- Brand is **Eclipse Motors**; domain **https://eclipsemotors.org**.
- No secrets in client bundle or committed source. Server env only: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (bootstrap), `UPLOAD_DIR`.
- Keep existing component surfaces stable: components keep reading `useStore((s) => s.cars)` etc. Only the store internals, the data layer, pages needing SEO, and the admin car-form change.
- The live static site must keep serving until the Node app is verified on the server; cut the nginx vhost over only at the end (Task 12).
- Bump `next` off 14.2.15 to a patched 14.2.x (Finding #7).
- No unit-test framework exists; verification is `npm run build`, `npm run typecheck`, `curl`, and DB queries.
- Commit after each task with the trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` /
  `Claude-Session: https://claude.ai/code/session_01QkA2K5T7zv6dmMSL7KXffK`

## File structure

- Create `lib/db/pool.ts` — pg Pool singleton from `DATABASE_URL`.
- Create `lib/db/schema.sql` — idempotent `CREATE TABLE IF NOT EXISTS` for all tables.
- Create `lib/db/migrate.ts` — runs schema.sql + seeds cars/discounts/settings/admin if empty.
- Create `lib/db/cars.ts`, `lib/db/discounts.ts`, `lib/db/settings.ts`, `lib/db/admins.ts` — typed query fns returning `lib/types` shapes.
- Rewrite `lib/api.ts` — server data-access calling `lib/db/*` (used by server components + route handlers).
- Create `lib/session.ts` — jose sign/verify + cookie helpers.
- Create `middleware.ts` — guard `/api/admin/*` (and `/admin` optionally) via session cookie.
- Create route handlers under `app/api/`:
  - `cars/route.ts` (GET), `discounts/route.ts` (GET), `settings/route.ts` (GET)
  - `admin/login/route.ts` (POST), `admin/logout/route.ts` (POST), `admin/session/route.ts` (GET)
  - `admin/cars/route.ts` (POST), `admin/cars/[id]/route.ts` (PATCH, DELETE)
  - `admin/discounts/route.ts` + `[id]`, `admin/settings/route.ts` (PATCH)
  - `admin/upload/route.ts` (POST multipart)
- Modify `lib/store.ts` — remove seed-as-source; add async `hydrate()`; mutations call API.
- Create `components/providers/store-hydrator.tsx` — calls `hydrate()` on mount; mounted in `app/layout.tsx`.
- Modify `lib/auth.ts` — call `/api/admin/*` instead of client credential compare.
- Modify `app/car/[id]/page.tsx` — dynamic server component (drop `_view`/`generateStaticParams`).
- Modify `components/admin/car-form.tsx` — file-upload UI → `/api/admin/upload`.
- Modify `next.config.mjs` — remove `output: export`, basePath/Pages; images unoptimized + allow `/uploads`.
- Create `docker-compose.yml` + update `.env.example`.
- Create `deploy/pm2/ecosystem.config.js` and update `deploy/nginx/eclipsemotors.conf` (proxy).

---

### Task 1: Dependencies + Next config (Node app, not static)

**Files:** Modify `package.json`, `next.config.mjs`.

- [ ] **Step 1:** Add deps: `npm install pg bcryptjs jose && npm install -D @types/pg @types/bcryptjs`.
- [ ] **Step 2:** Bump Next: `npm install next@14.2.33 eslint-config-next@14.2.33`.
- [ ] **Step 3:** Rewrite `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },
};
export default nextConfig;
```

- [ ] **Step 4:** Delete the GitHub Pages workflow if present (`.github/workflows/*pages*`), since deploy is now the Node app. Verify: `ls .github/workflows 2>/dev/null`.
- [ ] **Step 5:** `npm run build` → expect success (still builds; now as server app). Commit.

---

### Task 2: Database pool + schema + migrate/seed

**Files:** Create `lib/db/pool.ts`, `lib/db/schema.sql`, `lib/db/migrate.ts`.

**Interfaces:**
- Produces: `getPool(): Pool`; `migrate(): Promise<void>` (idempotent: creates tables, seeds cars/discounts/settings from `SEED_CARS`/`SEED_DISCOUNTS` and admin from env if tables empty).

- [ ] **Step 1:** `lib/db/pool.ts`:

```ts
import { Pool } from "pg";

let pool: Pool | undefined;
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}
```

- [ ] **Step 2:** `lib/db/schema.sql` — tables `cars`, `car_images`, `discounts`, `settings`, `admin_users` mirroring `lib/types.ts` (cars scalar cols incl. optional extended specs; `features text[]`; `car_images(car_id references cars(id) on delete cascade, position int, alt text)`; `settings` single row id=1; `admin_users(email unique, password_hash)`). All `CREATE TABLE IF NOT EXISTS`.
- [ ] **Step 3:** `lib/db/migrate.ts` — reads schema.sql, executes it; then: if `cars` empty, insert `SEED_CARS` (+ their images); if `discounts` empty, insert `SEED_DISCOUNTS`; if `settings` empty, insert defaults from `SITE_CONFIG`; if `admin_users` empty and `ADMIN_EMAIL`+`ADMIN_PASSWORD` set, insert with `bcrypt.hashSync(ADMIN_PASSWORD, 10)`.
- [ ] **Step 4:** Add script `"db:migrate": "tsx lib/db/migrate.ts"` (add `tsx` dev dep) and call `migrate()` at server start via `"start": "node -r ... "` — simpler: run `npm run db:migrate` in the deploy step before `next start`.
- [ ] **Step 5:** Verify locally against docker Postgres (Task 11 provides it) or defer verify to Task 11. Typecheck: `npm run typecheck`. Commit.

---

### Task 3: Typed DB query modules

**Files:** Create `lib/db/cars.ts`, `discounts.ts`, `settings.ts`, `admins.ts`.

**Interfaces (Produces):**
- `dbGetCars(): Promise<Car[]>`, `dbGetCarById(id): Promise<Car|undefined>`, `dbCreateCar(input): Promise<Car>`, `dbUpdateCar(id, patch): Promise<Car|undefined>`, `dbDeleteCar(id): Promise<void>`.
- `dbGetDiscounts()`, `dbCreateDiscount`, `dbUpdateDiscount`, `dbDeleteDiscount`.
- `dbGetSettings(): Promise<Settings>`, `dbUpdateSettings(patch): Promise<Settings>`.
- `dbGetAdminByEmail(email): Promise<{id,email,passwordHash}|undefined>`.

- [ ] **Step 1–4:** Implement each with parameterized SQL, mapping rows → `lib/types` shapes (cars join `car_images` ordered by position → `images[]`). Cars create/update also upsert `car_images`. Use `id` generated as `car-<uuid>` server-side.
- [ ] **Step 5:** `npm run typecheck`; commit.

---

### Task 4: Rewire `lib/api.ts` to the DB

**Files:** Modify `lib/api.ts`.

- [ ] **Step 1:** Replace seed reads with DB calls: `getCars`→`dbGetCars`, `getCarById`→`dbGetCarById`, `getDiscountCodes`→`dbGetDiscounts`. Remove `getAllCarIds` (no longer needed; detail route is dynamic). Keep the module server-only.
- [ ] **Step 2:** `npm run build` (will fail where `getAllCarIds` was imported — fixed in Task 7). Commit after Task 7 or use `export const dynamic`. Typecheck; commit.

---

### Task 5: Session helpers + middleware (real auth core)

**Files:** Create `lib/session.ts`, `middleware.ts`.

**Interfaces:**
- `createSessionCookie(email): Promise<string>` (jose JWT, 7d, signed with `SESSION_SECRET`), `verifySession(token): Promise<{email}|null>`, cookie name `em_session`, flags httpOnly+Secure+SameSite=Lax+Path=/.

- [ ] **Step 1:** `lib/session.ts` with jose `SignJWT`/`jwtVerify`.
- [ ] **Step 2:** `middleware.ts`: for `/api/admin/:path*` (except `/api/admin/login`), read `em_session` cookie, `verifySession`; if invalid → `NextResponse.json({error:"unauthorized"},{status:401})`. `export const config = { matcher: ["/api/admin/:path*"] }`.
- [ ] **Step 3:** `npm run build`; commit.

---

### Task 6: Auth + public API route handlers

**Files:** Create `app/api/cars/route.ts`, `discounts/route.ts`, `settings/route.ts`, `admin/login/route.ts`, `admin/logout/route.ts`, `admin/session/route.ts`.

**Interfaces (Produces):**
- `GET /api/cars` → `{cars: Car[]}`; `GET /api/discounts` → `{discounts}`; `GET /api/settings` → `{settings}`.
- `POST /api/admin/login {email,password}` → sets `em_session`, `{ok:true}` or 401.
- `POST /api/admin/logout` → clears cookie. `GET /api/admin/session` → `{email}|401`.
- All handlers `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`.

- [ ] **Step 1–3:** Implement. Login: `dbGetAdminByEmail` + `bcrypt.compare`; on success set cookie via `cookies().set(...)`.
- [ ] **Step 4:** `npm run build`; commit.

---

### Task 7: Admin write API + car-detail dynamic page

**Files:** Create `app/api/admin/cars/route.ts` (POST), `app/api/admin/cars/[id]/route.ts` (PATCH/DELETE), `admin/discounts/*`, `admin/settings/route.ts`. Modify `app/car/[id]/page.tsx`.

- [ ] **Step 1:** Admin car/discount/settings write handlers call the `lib/db/*` mutators (auth already enforced by middleware).
- [ ] **Step 2:** Rewrite `app/car/[id]/page.tsx`: remove `FALLBACK_ID`/`generateStaticParams`; `export const dynamic = "force-dynamic"`; `generateMetadata` uses `dbGetCarById`; render `<CarDetail id={params.id} />`.
- [ ] **Step 3:** `npm run build` (should now pass — `getAllCarIds` gone). Commit.

---

### Task 8: Photo upload endpoint

**Files:** Create `app/api/admin/upload/route.ts`.

**Interfaces:** `POST /api/admin/upload` (multipart, field `file`) → `{url:"/uploads/<name>"}`. Validates MIME in {jpeg,png,webp}, size ≤ 8 MB; writes to `process.env.UPLOAD_DIR || "./public/uploads"`; filename `crypto.randomUUID()+ext`. `runtime="nodejs"`.

- [ ] **Step 1–2:** Implement with `await req.formData()`, `fs/promises.writeFile`. Ensure dir exists (`mkdir recursive`).
- [ ] **Step 3:** `npm run build`; commit.

---

### Task 9: Store re-backing + hydrator + auth client

**Files:** Modify `lib/store.ts`, `lib/auth.ts`; create `components/providers/store-hydrator.tsx`; modify `app/layout.tsx`.

- [ ] **Step 1:** `lib/store.ts`: default `cars: []`, `discounts: []`; keep `favourites`, `currency` persisted (localStorage). Add async `hydrate()` → fetch `/api/cars`,`/api/discounts`,`/api/settings`, `set(...)`. Convert `addCar/updateCar/deleteCar/duplicateCar/setCarStatus` and discount/settings actions to `async`: call the matching `/api/admin/*` route, then update local state from the response. Keep `recordEvent`/analytics client-only (documented).
- [ ] **Step 2:** `store-hydrator.tsx` (`"use client"`): `useEffect(() => { useStore.getState().hydrate(); }, [])`; render nothing. Mount in `app/layout.tsx` inside `<body>`.
- [ ] **Step 3:** `lib/auth.ts`: `signIn` → `POST /api/admin/login`; on ok set `email`; add `checkSession()` → `GET /api/admin/session`; `signOut` → `POST /api/admin/logout`. Remove `ADMIN_CREDENTIALS` usage.
- [ ] **Step 4:** `npm run build` + `npm run typecheck`; commit.

---

### Task 10: Admin car-form photo uploads

**Files:** Modify `components/admin/car-form.tsx`.

- [ ] **Step 1:** Replace the curated-gallery offset/count inputs with a file picker that uploads each selected file to `/api/admin/upload` and collects returned URLs into the car's `images[]` (position by order, first = cover). Show thumbnails + allow remove/reorder-by-remove. Keep URL-paste as a fallback field.
- [ ] **Step 2:** `npm run build`; commit.

---

### Task 11: Local mirror — docker-compose + env + verify end-to-end locally

**Files:** Create `docker-compose.yml`; modify `.env.example`; create `.env.local` (gitignored).

- [ ] **Step 1:** `docker-compose.yml` with `postgres:16`, db `eclipse`, user/pass, port 5432, volume.
- [ ] **Step 2:** `.env.example` add `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `UPLOAD_DIR`. Ensure `.env.local`, `/public/uploads` gitignored.
- [ ] **Step 3:** Verify: `docker compose up -d`; `npm run db:migrate` (creates tables + seeds); `npm run build`; `npm start`; then `curl localhost:3000/api/cars` → seeded cars; `curl -X POST localhost:3000/api/admin/login` with seeded admin → sets cookie; authed `POST /api/admin/cars` → 200 and appears in `GET /api/cars`; unauth `POST /api/admin/cars` → 401. Commit.

---

### Task 12: Deploy cutover on Contabo

**Files:** Create `deploy/pm2/ecosystem.config.js`; modify `deploy/nginx/eclipsemotors.conf`.

- [ ] **Step 1:** On server: create Postgres `eclipse` DB + role; set `/var/www/CarLab/.env` (chmod 600) with `DATABASE_URL`, generated `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `UPLOAD_DIR=/var/www/eclipse-uploads`; `mkdir -p /var/www/eclipse-uploads`.
- [ ] **Step 2:** `git pull`; `npm ci --omit=dev` won't work (needs build) → `npm install`; `npm run build`; `npm run db:migrate`.
- [ ] **Step 3:** `ecosystem.config.js` runs `npm start` on port 3001 (`PORT=3001`); `pm2 start deploy/pm2/ecosystem.config.js`; `pm2 save`; `pm2 startup` (ensure resurrection on reboot).
- [ ] **Step 4:** Update `/etc/nginx/sites-available/eclipsemotors`: replace static `root`/`location /`/`/car/`/`/admin` Basic Auth with `location / { proxy_pass http://127.0.0.1:3001; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto https; proxy_set_header X-Forwarded-For $remote_addr; }` and `location /uploads/ { alias /var/www/eclipse-uploads/; expires 30d; }`. Keep security headers + certbot SSL. Remove the nginx `/admin` Basic Auth (app now enforces real login). `nginx -t && systemctl reload nginx`.
- [ ] **Step 5:** Verify live: `GET https://eclipsemotors.org/api/cars` returns cars; site loads; `/admin` login works with the real credentials; add a car in admin → visible in a **fresh incognito browser** (cross-device persistence proven); upload a photo → served from `/uploads/`. Update `deploy/nginx/eclipsemotors.conf` reference copy; commit + push.

---

## Self-Review

**Spec coverage:** Persistence → Tasks 2–4,6,7,9,12. Photo uploads → Tasks 8,10,12. Real admin auth → Tasks 5,6,9,12. Deploy-model change → Tasks 1,12. Local mirror → Task 11. `next` CVE bump → Task 1. nginx Basic Auth removed in favour of app auth → Task 12 Step 4. **No gaps.**

**Placeholder scan:** Tasks 2,3 describe SQL/mapping at interface level rather than full literal SQL — acceptable because the shapes are fully specified by `lib/types.ts` and enumerated; implementer writes parameterized SQL to match. All novel/critical code (pool, config, session, middleware, upload contract, store hydration) is spelled out.

**Type consistency:** `dbGetCars`/`dbGetCarById`/`dbCreateCar` names used consistently across Tasks 3,4,6,7; cookie `em_session` consistent Tasks 5,6; API paths consistent Tasks 6,7,9.

**Risk controls:** Live static site stays up until Task 12 cutover; migrations idempotent; pm2 resurrection configured; SESSION_SECRET/admin password server-env only.
