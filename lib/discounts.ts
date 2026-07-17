import type { Car, DiscountCode, DiscountResult } from "@/lib/types";

/**
 * Validate a discount code against a car and return the resulting price.
 * Pure function — no side effects — so it can run on client or server.
 */
export function applyDiscount(
  rawCode: string,
  car: Pick<Car, "priceGhs" | "make">,
  codes: DiscountCode[],
): DiscountResult {
  const base: DiscountResult = {
    ok: false,
    originalPrice: car.priceGhs,
    finalPrice: car.priceGhs,
    savedAmount: 0,
  };

  const normalized = rawCode.trim().toUpperCase();
  if (!normalized) {
    return { ...base, error: "Enter a code to apply." };
  }

  const code = codes.find((c) => c.code.toUpperCase() === normalized);
  if (!code) {
    return { ...base, error: "That code doesn't exist." };
  }
  if (!code.active) {
    return { ...base, error: "This code is no longer active." };
  }
  if (code.expiresAt && new Date(code.expiresAt).getTime() < Date.now()) {
    return { ...base, error: "This code has expired." };
  }
  if (
    typeof code.usageLimit === "number" &&
    code.usedCount >= code.usageLimit
  ) {
    return { ...base, error: "This code has reached its usage limit." };
  }
  if (
    code.makeRestriction &&
    code.makeRestriction.toLowerCase() !== car.make.toLowerCase()
  ) {
    return {
      ...base,
      error: `This code only applies to ${code.makeRestriction} vehicles.`,
    };
  }
  if (typeof code.minPrice === "number" && car.priceGhs < code.minPrice) {
    return {
      ...base,
      error: `Valid on vehicles from GHS ${code.minPrice.toLocaleString()}.`,
    };
  }

  const saved =
    code.type === "percent"
      ? Math.round((car.priceGhs * code.value) / 100)
      : Math.min(code.value, car.priceGhs);

  const finalPrice = Math.max(0, car.priceGhs - saved);

  return {
    ok: true,
    code,
    originalPrice: car.priceGhs,
    finalPrice,
    savedAmount: saved,
  };
}
