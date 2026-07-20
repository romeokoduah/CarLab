# Import Duty Calculator + Flicker Fix — Design

**Date:** 2026-07-20
**Status:** Approved → planning
**Site:** https://eclipsemotors.org

## Problem

1. Customers want to know the landed cost of importing a used car into Ghana. There is no tool on the site.
2. The public pages **flicker on mobile** — a regression from Phase 2.
3. Styling of the new page should read **corporate**, keeping only subtle motion.

## Research findings (sources at bottom)

Authoritative (GRA):

- **Import duty by engine capacity** — Petrol: ≤1000cc 5%, 1001–3000cc 10%, >3000cc 20%. Diesel: ≤1500cc 5%, 1501–2500cc 10%, >2500cc 20%.
- **Levies:** NHIL 2.5%, GETFund 2.5%, ECOWAS 0.5%, AU 0.2%, Processing Fee 1%, Exam Fee 1% (used vehicles only), Special Import Levy 2%.

Critical caveats that shape the design:

- **The duty base is not the purchase price.** ICUMS derives a **Home Delivery Value (HDV)** from VIN + country + age, and it typically exceeds market value. Only ICUMS produces the binding figure — ours is necessarily an **estimate**.
- **Overage penalties are not codified by GRA.** Sources conflict (5/10/15/50% vs 12.5/20%). trade.gov and the majority converge on: **<10yrs 0%, 10–12yrs 12.5%, 12–15yrs 20%**. Treated as broker practice, clearly labelled, and editable.
- **Rates drift each budget.** GRA's page still lists VAT 12.5% while trade.gov reports **15%**; the age-depreciation discount was **abolished in 2023**. Hardcoding guarantees staleness.
- **Levy bases are not published line-by-line.** The compounding order below is standard broker practice, so the UI must show the formula transparently rather than emit a black-box number.

## Design

### 1. Calculation module `lib/duty.ts` (pure, unit-tested)

Inputs: `cif` (GHS), `fuel`, `engineCc`, `yearOfManufacture`, `currentYear`.
Order of computation (each line exposed in the result for transparency):

1. `importDuty = CIF × bandRate` (band from fuel + cc)
2. `overagePenalty = CIF × overageRate` (from age brackets)
3. On **CIF**: ECOWAS 0.5%, AU 0.2%, Special Import 2%, Processing 1%, Exam 1%
4. On **CIF + importDuty**: NHIL 2.5%, GETFund 2.5%, COVID 1%
5. On **CIF + importDuty + NHIL + GETFund + COVID**: VAT 15%
6. `total` = sum of 1–5 (the duty payable; excludes the CIF itself)

Returns `{ lines: [{label, basis, rate, amount}], total, dutyRate, overageRate }` so the UI can render an auditable table. Pure function → unit tested with `node:test` via `tsx` (no new dependency).

### 2. Admin-editable rates

New singleton table `duty_config (id=1, config jsonb, updated_at)` holding duty bands, overage brackets, and all levy rates, seeded with the GRA figures above. Surfaced as a **"Duty rates"** tab in admin. Public `GET /api/duty-config`; protected `PATCH /api/admin/duty-config`.

### 3. Page `/duty-calculator`

Server component fetches the config and renders a client form. Corporate styling: clean bordered cards, strong typographic hierarchy, gold as accent only, a line-item results table, results in GHS + USD (rate prefilled from settings, editable). Motion limited to `BlurFade` reveals — **no** MagicCard glow, BorderBeam, or animated borders. Prominent disclaimer + link to the official ICUMS calculator. Linked from the site nav.

### 4. Flicker fix (Phase-2 regression)

Cause: components gate on `mounted`, but the store's `cars` now load from `/api/cars` *after* mount → render sequence is **skeleton → empty grid → content**. The empty phase is the flicker (longer on mobile). Public HTML also contains zero car content (bad for SEO).

Fix: server-fetch cars in the page (server component) and pass `initialCars` into the client component, which renders:

```ts
const cars = hydrated ? storeCars : initialCars;
```

Server render and first client render both use `initialCars` → no hydration mismatch, no empty phase, and listings appear in the HTML. Applies to `FeaturedCars`, `StatsBand` (home), `InventoryClient` (inventory), `CarDetail` (car page). The `mounted` guard is **kept** where state is genuinely client-only (favourites, currency toggle).

## Out of scope (YAGNI)

- Replicating ICUMS VIN→HDV lookup (not publicly available; would create false precision).
- Restyling the rest of the site to corporate (offered as a separate pass).
- Duty estimates attached to individual listings (chosen: standalone tool).

## Risks

- **Wrong-figure risk:** mitigated by "estimate only" labelling, transparent per-line formula, editable rates, and linking to ICUMS as the authority.
- Flicker fix touches public pages → verify no hydration warnings after change.

## Sources

- GRA – Vehicle Importation: https://gra.gov.gh/customs/vehicle-importation/
- trade.gov – Ghana Customs Valuation for Used Vehicles: https://www.trade.gov/market-intelligence/ghana-customs-valuation-used-vehicles
- ICUMS official used-vehicle calculator: https://external.unipassghana.com/cl/tm/tax/selectUsedVehicleTaxCalculate.do?decorator=popup&MENU_ID=IIM01S03V02
