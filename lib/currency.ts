import type { Currency } from "@/lib/types";

/**
 * Format a GHS-denominated price into the chosen display currency.
 * Prices are always stored in GHS; USD is derived with the configurable rate.
 */
export function formatPrice(
  priceGhs: number,
  currency: Currency,
  ghsPerUsd: number,
): string {
  if (currency === "USD") {
    const usd = priceGhs / (ghsPerUsd || 1);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(usd);
  }
  // GHS — Intl support for the symbol is patchy, so format manually.
  const value = new Intl.NumberFormat("en-GH", {
    maximumFractionDigits: 0,
  }).format(priceGhs);
  return `GHS ${value}`;
}

/** Compact price for tight spaces, e.g. GHS 685K / $44K */
export function formatPriceCompact(
  priceGhs: number,
  currency: Currency,
  ghsPerUsd: number,
): string {
  const value = currency === "USD" ? priceGhs / (ghsPerUsd || 1) : priceGhs;
  const symbol = currency === "USD" ? "$" : "GHS ";
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${symbol}${Math.round(value / 1_000)}K`;
  return `${symbol}${Math.round(value)}`;
}
