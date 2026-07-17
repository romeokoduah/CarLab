"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/hooks";
import type { Currency } from "@/lib/types";

export function CurrencyToggle({ className }: { className?: string }) {
  const currency = useStore((s) => s.currency);
  const setCurrency = useStore((s) => s.setCurrency);
  const mounted = useMounted();
  const active: Currency = mounted ? currency : "GHS";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-secondary/60 p-0.5 text-xs font-medium",
        className,
      )}
      role="group"
      aria-label="Display currency"
    >
      {(["GHS", "USD"] as Currency[]).map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          aria-pressed={active === c}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors",
            active === c
              ? "bg-gold text-black"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
