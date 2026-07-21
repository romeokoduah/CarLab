import type { BodyType } from "@/lib/types";

/**
 * Landed-cost pricing for imported stock.
 *
 * A car is bought in China (RMB), carries fixed RMB costs for insurance,
 * transport and inspection plus a fixed RMB margin, and is shipped on a quote
 * denominated in USD. The public cedi price is the sum, converted at the two
 * rates the dealer sets. Import duty is deliberately excluded — it is quoted
 * separately by the duty calculator (lib/duty.ts).
 */

/** Insurance + inland transport + inspection, charged on every vehicle. */
export const LOGISTICS_RMB = 3500;

interface BodyDefaults {
  profitRmb: number;
  shippingUsd: number;
}

const SEDAN_DEFAULTS: BodyDefaults = { profitRmb: 12000, shippingUsd: 1800 };
const LARGE_DEFAULTS: BodyDefaults = { profitRmb: 16000, shippingUsd: 2300 };

/**
 * Margin and shipping for a body type. Sedans are the small-vehicle rate;
 * everything else ships and earns at the SUV rate.
 */
export function defaultsForBody(bodyType: BodyType): BodyDefaults {
  return bodyType === "Sedan" ? SEDAN_DEFAULTS : LARGE_DEFAULTS;
}

export interface CostBreakdown {
  /** Purchase price agreed with the Chinese seller. */
  carRmb?: number;
  logisticsRmb?: number;
  profitRmb?: number;
  shippingUsd?: number;
  ghsPerRmb?: number;
  ghsPerUsd?: number;
}

/**
 * Prices are advertised in whole hundreds of cedis.
 *
 * Settled to the pesewa first: rate arithmetic leaves float noise (95,500 ×
 * 2.2 = 210100.00000000003) and rounding that up would add a whole GHS 100.
 */
function roundToHundred(value: number): number {
  const settled = Math.round(value * 100) / 100;
  return Math.ceil(settled / 100) * 100;
}

const isPositive = (n: number | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

const orZero = (n: number | undefined): number =>
  typeof n === "number" && Number.isFinite(n) ? n : 0;

/**
 * Final cedi price, or `undefined` when the breakdown is incomplete — a car
 * price and both exchange rates are required before any figure is meaningful.
 */
export function computeFinalPriceGhs(b: CostBreakdown): number | undefined {
  if (!isPositive(b.carRmb)) return undefined;
  if (!isPositive(b.ghsPerRmb) || !isPositive(b.ghsPerUsd)) return undefined;

  const rmbSubtotal = b.carRmb + orZero(b.logisticsRmb) + orZero(b.profitRmb);
  const total =
    rmbSubtotal * b.ghsPerRmb + orZero(b.shippingUsd) * b.ghsPerUsd;
  return roundToHundred(total);
}

/** True once the car has enough stored inputs to reproduce its own price. */
export function hasBreakdown(b: CostBreakdown): boolean {
  return isPositive(b.carRmb);
}

// ── Repricing on an exchange-rate change ───────────────────────────────────

export interface Rates {
  ghsPerRmb: number;
  ghsPerUsd: number;
}

/** The subset of a car this module needs; keeps the DB and UI both callable. */
export interface PriceableCar {
  id: string;
  make: string;
  model: string;
  year: number;
  priceGhs: number;
  costCarRmb?: number;
  costLogisticsRmb?: number;
  costProfitRmb?: number;
  costShippingUsd?: number;
  rateGhsPerRmb?: number;
  rateGhsPerUsd?: number;
  /** Rates deliberately fixed to this listing; ignores Settings changes. */
  ratesPinned?: boolean;
}

/**
 * Whether a Settings rate change should reach this listing.
 *
 * Two kinds of car are deliberately left alone: those priced by hand (no
 * breakdown at all, including every listing created before the breakdown
 * existed) and those whose rates the admin pinned.
 */
export function followsGlobalRates(car: PriceableCar): boolean {
  return hasBreakdown({ carRmb: car.costCarRmb }) && !car.ratesPinned;
}

export interface RepriceRow {
  id: string;
  label: string;
  oldPriceGhs: number;
  newPriceGhs: number;
}

/**
 * Cars whose cedi price moves under `rates`, with the new figure. Cars that do
 * not follow the global rates, and those whose price is unchanged, are omitted
 * — so an empty result means "nothing to do".
 */
export function previewReprice(
  cars: PriceableCar[],
  rates: Rates,
): RepriceRow[] {
  const rows: RepriceRow[] = [];
  for (const car of cars) {
    if (!followsGlobalRates(car)) continue;
    const newPriceGhs = computeFinalPriceGhs({
      carRmb: car.costCarRmb,
      logisticsRmb: car.costLogisticsRmb,
      profitRmb: car.costProfitRmb,
      shippingUsd: car.costShippingUsd,
      ghsPerRmb: rates.ghsPerRmb,
      ghsPerUsd: rates.ghsPerUsd,
    });
    if (newPriceGhs == null || newPriceGhs === car.priceGhs) continue;
    rows.push({
      id: car.id,
      label: `${car.year} ${car.make} ${car.model}`,
      oldPriceGhs: car.priceGhs,
      newPriceGhs,
    });
  }
  return rows;
}
