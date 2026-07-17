"use client";

import { X } from "lucide-react";
import type { Filters } from "@/lib/filters";
import { formatMileage } from "@/lib/utils";

interface Chip {
  key: string;
  label: string;
  clear: () => void;
}

export function FilterChips({
  filters,
  onChange,
  facetPrice,
  facetYear,
  facetMileage,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  facetPrice: { min: number; max: number };
  facetYear: { min: number; max: number };
  facetMileage: number;
}) {
  const chips: Chip[] = [];

  const listKeys: [keyof Filters, string][] = [
    ["makes", ""],
    ["models", ""],
    ["bodyTypes", ""],
    ["transmissions", ""],
    ["fuels", ""],
    ["conditions", ""],
    ["colours", ""],
  ];

  for (const [key] of listKeys) {
    const values = filters[key] as string[];
    for (const v of values) {
      chips.push({
        key: `${key}-${v}`,
        label: v,
        clear: () =>
          onChange({
            [key]: (filters[key] as string[]).filter((x) => x !== v),
          } as Partial<Filters>),
      });
    }
  }

  if (filters.q) {
    chips.push({
      key: "q",
      label: `“${filters.q}”`,
      clear: () => onChange({ q: "" }),
    });
  }
  if (filters.priceMin != null || filters.priceMax != null) {
    const lo = filters.priceMin ?? facetPrice.min;
    const hi = filters.priceMax ?? facetPrice.max;
    chips.push({
      key: "price",
      label: `GHS ${Math.round(lo / 1000)}K–${Math.round(hi / 1000)}K`,
      clear: () => onChange({ priceMin: undefined, priceMax: undefined }),
    });
  }
  if (filters.yearMin != null || filters.yearMax != null) {
    const lo = filters.yearMin ?? facetYear.min;
    const hi = filters.yearMax ?? facetYear.max;
    chips.push({
      key: "year",
      label: `${lo}–${hi}`,
      clear: () => onChange({ yearMin: undefined, yearMax: undefined }),
    });
  }
  if (filters.mileageMax != null) {
    chips.push({
      key: "mileage",
      label: `≤ ${formatMileage(filters.mileageMax)}`,
      clear: () => onChange({ mileageMax: undefined }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={c.clear}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 py-1 pl-3 pr-2 text-xs font-medium transition-colors hover:bg-secondary"
        >
          {c.label}
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}
