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

/** Prices are advertised in whole hundreds of cedis. */
function roundToHundred(value: number): number {
  return Math.ceil(value / 100) * 100;
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
