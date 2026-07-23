"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Filters } from "@/lib/filters";

interface PriceBand {
  label: string;
  min?: number;
  max?: number;
}

const PRICE_BANDS: PriceBand[] = [
  { label: "Under GHS 150k", max: 150_000 },
  { label: "150k–250k", min: 150_000, max: 250_000 },
  { label: "250k+", min: 250_000 },
];

/**
 * One-tap shortcuts above the grid — the fastest way to narrow the list
 * without opening the full filter panel. Body-type chips are built from what
 * is actually in stock; price bands are fixed GHS brackets. Each toggles the
 * matching filter and shows an active tick.
 */
export function QuickChips({
  bodyTypes,
  filters,
  onChange,
}: {
  bodyTypes: string[];
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
}) {
  const toggleBody = (b: string) => {
    const on = filters.bodyTypes.includes(b);
    onChange({
      bodyTypes: on
        ? filters.bodyTypes.filter((x) => x !== b)
        : [...filters.bodyTypes, b],
    });
  };

  const bandActive = (band: PriceBand) =>
    (band.min ?? undefined) === filters.priceMin &&
    (band.max ?? undefined) === filters.priceMax;

  const toggleBand = (band: PriceBand) => {
    if (bandActive(band)) {
      onChange({ priceMin: undefined, priceMax: undefined });
    } else {
      onChange({ priceMin: band.min, priceMax: band.max });
    }
  };

  if (!bodyTypes.length) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {bodyTypes.map((b) => (
        <Chip key={b} active={filters.bodyTypes.includes(b)} onClick={() => toggleBody(b)}>
          {b}
        </Chip>
      ))}
      <span className="mx-1 hidden h-5 w-px bg-border sm:inline-block" />
      {PRICE_BANDS.map((band) => (
        <Chip
          key={band.label}
          active={bandActive(band)}
          onClick={() => toggleBand(band)}
        >
          {band.label}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-gold/50 bg-gold/10 text-foreground"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {active && <Check className="h-3.5 w-3.5 text-gold" />}
      {children}
    </button>
  );
}
