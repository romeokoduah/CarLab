# Vehicle cost breakdown — design

Date: 2026-07-21

## Problem

Listings are priced by typing a cedi figure straight into the admin form. The
real pricing is built from a Chinese purchase in RMB, fixed logistics and profit
margins, and a shipping quote in USD. Doing that arithmetic by hand before every
listing is slow and easy to get wrong, and the working is lost the moment the
price is saved.

## Solution

Add a **Cost breakdown** section to the admin car form that captures the inputs
and derives the public cedi price.

### Formula

```
rmbSubtotal = carRmb + logisticsRmb + profitRmb
finalGhs    = rmbSubtotal × ghsPerRmb  +  shippingUsd × ghsPerUsd
```

Rounded up to the nearest GHS 100.

### Defaults

| Input | Sedan | Every other body type |
| --- | --- | --- |
| Logistics (insurance + transport + inspection) | ¥3,500 | ¥3,500 |
| Profit | ¥12,000 | ¥16,000 |
| Shipping | $1,800 | $2,300 |

Selecting a body type refills profit and shipping. Every figure stays editable —
a "Reset to defaults" action restores the table above.

### Exchange rates

`ghsPerRmb` joins the existing `ghsPerUsd` in admin Settings. Both pre-fill a new
listing and can be overridden per car; the rate actually used is stored with the
car so a saved listing always explains its own price.

Duty is **not** part of this calculation — it remains in the standalone duty
calculator.

### Price field

`Price (GHS)` becomes read-only and tracks the breakdown live. A "Set price
manually" switch unlocks it for off-formula pricing (promotions, hand-negotiated
deals). Cars saved before this change have no breakdown and stay manual.

### Visibility

Admin-only. The public site is unchanged: it shows the final cedi price exactly
as it does today. No breakdown field is rendered on any public page.

## Data model

Six nullable columns on `cars`, added through `ALTER TABLE ... ADD COLUMN IF NOT
EXISTS` in `schema.sql` (already applied on every deploy by `lib/db/migrate.ts`):

- `cost_car_rmb`, `cost_logistics_rmb`, `cost_profit_rmb` — numeric
- `cost_shipping_usd` — numeric
- `rate_ghs_per_rmb`, `rate_ghs_per_usd` — numeric

`settings` gains `ghs_per_rmb numeric NOT NULL DEFAULT 2.1`.

Existing rows keep NULL costs and behave exactly as before.

## Components

- `lib/pricing.ts` — pure functions: per-body-type defaults, `computeFinalPriceGhs`.
  No React, no DB; unit-tested in `lib/pricing.test.ts`.
- `components/admin/car-form.tsx` — the breakdown UI, wired to `lib/pricing`.
- `components/admin/settings-form.tsx` — the GHS → RMB rate field.
- `lib/db/cars.ts` / `lib/db/settings.ts` — persistence of the new columns.

The API routes are pass-through and need no change.

## Testing

`lib/pricing.test.ts` covers the worked sedan and SUV examples, the body-type
default lookup, rounding, and the missing-input case (no car price entered →
no computed price, form stays manual).
