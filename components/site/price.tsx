"use client";

import { useStore } from "@/lib/store";
import { useMounted } from "@/lib/hooks";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface PriceProps {
  ghs: number;
  className?: string;
  /** if set and lower than ghs, ghs renders struck-through */
  discountedGhs?: number;
}

/** Currency-aware price display. Reads the active currency + rate from store. */
export function Price({ ghs, discountedGhs, className }: PriceProps) {
  const mounted = useMounted();
  const currency = useStore((s) => s.currency);
  const rate = useStore((s) => s.settings.ghsPerUsd);
  const cur = mounted ? currency : "GHS";

  const hasDiscount =
    typeof discountedGhs === "number" && discountedGhs < ghs;

  if (hasDiscount) {
    return (
      <span className={cn("flex flex-wrap items-baseline gap-2", className)}>
        <span className="font-semibold text-gold">
          {formatPrice(discountedGhs!, cur, rate)}
        </span>
        <span className="text-sm text-muted-foreground line-through">
          {formatPrice(ghs, cur, rate)}
        </span>
      </span>
    );
  }

  return (
    <span className={cn("font-semibold", className)}>
      {formatPrice(ghs, cur, rate)}
    </span>
  );
}
